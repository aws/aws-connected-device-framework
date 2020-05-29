/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import AWS = require('aws-sdk');
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { createDelimitedAttribute, PkType } from '../utils/pKUtils.util';

import { DeploymentList, DeploymentModel } from './deployment.model';

@injectable()
export class DeploymentDao {

    private dc: AWS.DynamoDB.DocumentClient;
    private readonly SI1_INDEX = 'sk-si1Sort-index';
    private readonly SI2_INDEX = 'si2Hash-sk-index';

    constructor(
        @inject('aws.dynamoDB.ggProvisioningTable') private provisioningTable: string,
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async isDeviceWhitelisted(deviceId: string): Promise<boolean> {
        logger.debug(`Deployment.dao: isDeviceWhitelisted: in target:${deviceId}`);

        const params = {
            TableName: this.provisioningTable,
            IndexName: this.SI2_INDEX,
            KeyConditionExpression: `#pk=:pk AND #sk=:sk`,
            ExpressionAttributeNames: {
                '#pk': 'si2Hash',
                '#sk': 'sk'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.GreengrassDevice, deviceId),
                ':sk': createDelimitedAttribute(PkType.GreengrassDevice, deviceId)
            }
        };

        const result = await this.dc.query(params).promise();
        if (result.Items===undefined || result.Items.length===0) {
            logger.debug('deployment.dao get: exit: undefined');
            return false;
        }

        return true;
    }

    public async save(deployment: DeploymentModel) {
        logger.debug(`deployment.dao: save: in: deployment: ${JSON.stringify(deployment)}`);

        const params = {
            TableName: this.provisioningTable,
            Item: {
                pk: createDelimitedAttribute(PkType.DeviceDeployment, deployment.deploymentId),
                sk:  createDelimitedAttribute(PkType.GreengrassDevice, deployment.deviceId),
                si1Sort: createDelimitedAttribute(PkType.GreengrassDevice, deployment.deploymentStatus, deployment.deviceId),
                si2Hash: createDelimitedAttribute(PkType.DeploymentTemplate, deployment.deploymentTemplateName, PkType.DeploymentTemplateVersion, deployment.deploymentTemplate.versionNo),
                createdAt: deployment.createdAt?.toISOString(),
                updatedAt: deployment.updatedAt?.toISOString(),
                deploymentTemplateName: deployment.deploymentTemplateName,
                deploymentStatus: deployment.deploymentStatus,
                deploymentType: deployment.deploymentType
            }
        };

        await this.dc.put(params).promise();

        logger.debug(`deployment.dao: save: exit: `);
    }

    public async getByDeviceId(deviceId: string) {
        logger.debug(`deployment.dao: get: in: deploymentId: ${deviceId}`);
    }

    public async get(deploymentId:string, deviceId: string) {
        logger.debug(`deployment.dao: list: in: deploymentId: ${deviceId}, deviceId: ${deploymentId}`);

        const params = {
            TableName: this.provisioningTable,
            KeyConditionExpression: `#pk=:pk AND #sk=:sk`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
                '#sk': 'sk'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.DeviceDeployment, deploymentId),
                ':sk': createDelimitedAttribute(PkType.GreengrassDevice, deviceId)
            }
        };

        const result = await this.dc.query(params).promise();
        if (result.Items===undefined || result.Items.length===0) {
            logger.debug('deployments.dao list: exit: undefined');
            return undefined;
        }

        const deploymentList = this.assembleDeployment(result.Items);

        logger.debug(`deployment.dao: list: exit: deploymentList: ${JSON.stringify(deploymentList)}`);

        return deploymentList.deployments[0];
    }

    public async list(deviceId: string, status?: string) : Promise<DeploymentList> {
        logger.debug(`deployment.dao: list: in: deployment: ${JSON.stringify(deviceId)}`);

        const params = {
            TableName: this.provisioningTable,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'sk',
                '#sk': 'si1Sort'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.GreengrassDevice, deviceId),
                ':sk': createDelimitedAttribute(PkType.GreengrassDevice)
            }
        };

        if(status) {
            params.ExpressionAttributeValues[':sk'] = createDelimitedAttribute(PkType.GreengrassDevice, status);
        }

        const result = await this.dc.query(params).promise();
        if (result.Items===undefined || result.Items.length===0) {
            logger.debug('deployments.dao list: exit: undefined');
            return undefined;
        }

        const deploymentList = this.assembleDeployment(result.Items);

        logger.debug(`deployment.dao: list: exit: deploymentList: ${JSON.stringify(deploymentList)}`);

        return deploymentList;
    }

    public async update(deployment: DeploymentModel): Promise<void> {
        logger.debug(`deployment.dao: update: in: deployment: ${JSON.stringify(deployment)}`);

        const params = {
            TableName: this.provisioningTable,
            Key: {
                pk: createDelimitedAttribute(PkType.DeviceDeployment, deployment.deploymentId),
                sk: createDelimitedAttribute(PkType.GreengrassDevice, deployment.deviceId),
            },
            UpdateExpression: 'set deploymentStatus = :s, si1Sort = :si1Sort',
            ExpressionAttributeValues: {
                ':s' : deployment.deploymentStatus,
                ':si1Sort': createDelimitedAttribute(PkType.GreengrassDevice, deployment.deploymentStatus, deployment.deviceId),
            }
        };

        const result = await this.dc.update(params).promise();

        logger.debug(`deployment.dao: save: exit: result: ${JSON.stringify(result)}`);

    }

    public async delete(deployment: DeploymentModel): Promise<void> {
        logger.debug(`deployment.dao: delete: in: deployment: ${JSON.stringify(deployment)}`);

        const params = {
            TableName: this.provisioningTable,
            Key: {
                pk: createDelimitedAttribute(PkType.DeviceDeployment, deployment.deploymentId),
                sk: createDelimitedAttribute(PkType.GreengrassDevice, deployment.deviceId),
            }
        };

        await this.dc.delete(params).promise();

        logger.debug(`deployment.dao delete: exit:`);
    }

    private assembleDeployment(items: AWS.DynamoDB.DocumentClient.ItemList): DeploymentList {
        const list = new DeploymentList();

        for(const i of items) {

            const pkElements = i.pk.split(':');
            const skElements = i.sk.split(':');

            const deployment: DeploymentModel = {
                deviceId: skElements[1],
                deploymentId: pkElements[1],
                createdAt: new Date(i.createdAt),
                updatedAt: new Date(i.updatedAt),
                deploymentTemplateName: i.deploymentTemplateName,
                deploymentStatus: i.deploymentStatus,
                deploymentType: i.deploymentType

            };

            list.deployments.push(deployment);
        }
        return list;
    }

}
