/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import config from 'config';
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';

import { AssociationModel, DeploymentModel, DeploymentSource } from './deployment.model';
import { ActivationDao } from '../activation/activation.dao';
import { AgentbasedDeploymentDao } from './agentbased-deployment.dao';

@injectable()
export class AgentbasedDeploymentService {

    private readonly ssm: AWS.SSM;
    private readonly sqs: AWS.SQS;
    private readonly s3: AWS.S3;

    constructor(
        @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject('aws.s3.deploymentLogs.bucket') private deploymentLogsBucket: string,
        @inject('aws.s3.deploymentLogs.prefix') private deploymentLogsPrefix: string,
        @inject(TYPES.ActivationDao) private activationDao: ActivationDao,
        @inject(TYPES.AgentbasedDeploymentDao) private agentbasedDeploymentDao: AgentbasedDeploymentDao
    ) {
        this.ssm = ssmFactory();
        this.sqs = sqsFactory();
        this.s3 = s3Factory();
    }

    public async create(deployment: DeploymentModel) {
        logger.debug(`agentbasedDeployment.service: create: in: deployment: ${deployment}`);

        const queueUrl:string = config.get('aws.sqs.agentbasedDeploymentQueue');

        const sqsRequest: AWS.SQS.SendMessageRequest = {
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(deployment)
        };

        let result;
        try {
            result = await this.sqs.sendMessage(sqsRequest).promise();
        } catch (err) {
            logger.error(`agentbasedDeployment.service sqs.sendMessage: in: ${sqsRequest} : error: ${JSON.stringify(err)}`);
            throw new Error(err);
        }

        logger.debug(`agentbasedDeployment.service: create: out: result: ${result}`);

        return result;
    }

    public async deploy(deployment: DeploymentModel) {
        logger.debug(`agentbasedDeploymentService: deploy: in: deployment: ${JSON.stringify(deployment)}`);

        const activation = await this.activationDao.getByDeviceId(deployment.deviceId);

        if(!activation) {
            throw new Error('DEVICE_ACTIVATION_NOT FOUND');
        }

        const instanceId = await this.getInstanceByActivationId(activation.activationId);

        if (!instanceId) {
            throw new Error('TARGET_INSTANCE_NOT_FOUND');
        }

        const playbookUrl = await this.getS3SignedURL(deployment.deploymentTemplate.source);

        const associationParams: AWS.SSM.CreateAssociationRequest = {
            Name: 'AWS-RunAnsiblePlaybook',
            AssociationName: `${deployment.deploymentId}_${deployment.deviceId}`,
            Parameters: {
                playbook: [''],
                playbookurl: [ playbookUrl ],
                extravars: [''],
                check: ['False']
            },
            // TODO: specify the output location of the logs dynamically
            OutputLocation: {
                'S3Location': {
                    'OutputS3BucketName': this.deploymentLogsBucket,
                    'OutputS3KeyPrefix': this.deploymentLogsPrefix
                }
            },
            ComplianceSeverity: 'UNSPECIFIED',
            Targets: [
                {
                    Values: [ instanceId ],
                    Key: 'InstanceIds'
                }
            ]
        };

        if(deployment.deploymentTemplate.envVars) {
            associationParams.Parameters.extravars = deployment.deploymentTemplate.envVars;
        }

        let association;
        try {
            association = await this.ssm.createAssociation(associationParams).promise();
        } catch (err) {
            logger.error(`ssm.createAssociation: in: ${associationParams} : error: ${JSON.stringify(err)}`);
            throw new Error(err);
        }

        const deploymentAssociation = {
            deploymentId: deployment.deploymentId,
            associationId: association.AssociationDescription.AssociationId
        };

        await this.agentbasedDeploymentDao.save(deploymentAssociation);

        logger.debug(`agentbasedDeploymentService: deploy: out: result: ${JSON.stringify(association)}`);

        return association;
    }

    public async delete(deployment: DeploymentModel): Promise<void> {
        logger.debug(`agentbasedDeploymentService: delete: in: deployment: ${deployment}`);

        const association = await this.agentbasedDeploymentDao.getByDeploymentId(deployment.deploymentId);

        if(!association) {
            return null;
        }

        const params: AWS.SSM.DeleteAssociationRequest = {
            AssociationId: association.associationId
        };

        let result;
        try {
            result = this.ssm.deleteAssociation(params).promise();
        } catch (err) {
            logger.error(`agentbasedDeployment.service ssm.deleteAssociation err: ${err}`);
            throw new Error(err);
        }

        await this.agentbasedDeploymentDao.delete(association);

        logger.debug(`agentbasedDeploymentService: delete: out: result: ${JSON.stringify(result)}`);
    }

    private async getInstanceByActivationId(activationId: string) {
        logger.debug(`agentbasedDeploymentService: getInstanceByActivationId: in: activation: ${activationId}`);

        const params = {
            InstanceInformationFilterList: [{
                key: 'ActivationIds',
                valueSet: [ activationId ]
            }]
        };
        let result;
        try {
            result = await this.ssm.describeInstanceInformation(params).promise();
        } catch(err) {
            logger.error(`agentbasedDeployment.service ssm.describeInstanceInformation err: ${err}`);
            throw new Error(err);
        }

        logger.debug(`agentbasedDeploymentService: getInstanceByActivationId: exit: instance: ${JSON.stringify(result)}`);

        return result.InstanceInformationList[0].InstanceId;
    }

    public async getInstance(instanceId: string): Promise<AWS.SSM.InstanceInformation> {
        logger.debug(`agentbasedDeploymentService: getInstance in: instanceId: ${instanceId}`);

        const params = {
            InstanceInformationFilterList: [{
                key: 'InstanceIds',
                valueSet: [ instanceId ]
            }]
        };
        let result;
        try {
            result = await this.ssm.describeInstanceInformation(params).promise();
        } catch(err) {
            logger.error(`agentbasedDeployment.service ssm.describeInstanceInformation err: ${err}`);
            throw new Error(err);
        }

        logger.debug(`agentbasedDeploymentService: getInstance: exit: instance: ${JSON.stringify(result)}`);

        return result.InstanceInformationList[0];
    }

    public async getDeploymentByAssociationId(associationId: string): Promise<AssociationModel> {
        logger.debug(`agentbasedDeploymentDao: getDeploymentByAssociationId in: associationId: ${associationId}`);

        let result;
        try {
            result = await this.agentbasedDeploymentDao.get(associationId);
        } catch (err) {
            logger.error(`agentbasedDeployment.service agentbasedDeploymentDao.get err: ${err}`);
            throw new Error(err);
        }

        logger.debug(`agentbasedDeploymentService: getDeploymentByInstanceId: exit: association: ${JSON.stringify(result)}`);

        return result;

    }

    private async getS3SignedURL(source: DeploymentSource) {
        logger.debug(`agentbasedDeployment.service getS3SignedURL: in source: ${JSON.stringify(source)}`);

        const params = { Bucket: source.bucket, Key: source.prefix };
        const url = await this.s3.getSignedUrl('getObject', params);

        logger.debug(`gentbasedDeployment.service getS3SignedURL: exit: out: url: ${url}`);

        return url;
    }
}
