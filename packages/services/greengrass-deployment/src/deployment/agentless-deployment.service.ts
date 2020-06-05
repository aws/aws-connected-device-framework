/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import config from 'config';
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';

import { DeploymentModel } from './deployment.model';

@injectable()
export class AgentlessDeploymentService {

    private readonly _sqs: AWS.SQS;

    constructor(
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS
    ) {
        this._sqs = sqsFactory();
    }

    public async create(deployment: DeploymentModel) {
        logger.debug(`agentlessDeploymentService: create: in: deployment: ${deployment}`);

        const queueUrl:string = config.get('aws.sqs.agentlessDeploymentQueue');

        const sqsRequest: AWS.SQS.SendMessageRequest = {
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(event),
            MessageGroupId: 'cdf-request-queue'
        };

        let result;
        try {
            result = await this._sqs.sendMessage(sqsRequest).promise();
        } catch (err) {
            logger.error(`sqs.sendMessage: in: ${sqsRequest} : error: ${JSON.stringify(err)}`);
            throw new Error(err);
        }

        logger.debug(`agentlessDeploymentService: create: out: result: ${result}`);

        return result;
    }

    public async deploy(deployment: DeploymentModel) {
        // TODO: implement Ansible agentless deployment
        // figure out if target needs to be tunneled
        // start a portforwarding session using ssm if needs to be tunneled
        // exectue ansible playbook,
        console.log(deployment);
    }
}
