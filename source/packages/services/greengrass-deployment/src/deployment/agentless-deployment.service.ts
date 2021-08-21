/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
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

    public async create(deployment: DeploymentModel): Promise<void> {
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

    }

    public async deploy(deployment: DeploymentModel): Promise<void> {
        // TODO: implement Ansible agentless deployment
        // figure out if target needs to be tunneled
        // start a portforwarding session using ssm if needs to be tunneled
        // exectue ansible playbook,
        logger.warn(JSON.stringify(deployment));
    }
}
