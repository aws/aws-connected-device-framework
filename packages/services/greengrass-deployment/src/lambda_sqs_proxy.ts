/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {logger} from './utils/logger';

import {TYPES} from './di/types';
import {container} from './di/inversify.config';

import {DeploymentService} from './deployment/deployment.service';
import {DeploymentModel} from './deployment/deployment.model';

const deploymentService: DeploymentService = container.get<DeploymentService>(TYPES.DeploymentService);

exports.handler = async(event: any, _context: any, callback: any) => {

    logger.debug(`event: ${JSON.stringify(event)}`);

    if(event.Records) {
        for (const record of event.Records) {
            if(record.eventSource === 'aws:sqs') {
                const deployment: DeploymentModel = JSON.parse(record.body);
                try {
                    await deploymentService.deploy(deployment);
                } catch (err) {
                    logger.error(`deploymentService.deploy: in: ${deployment} err: ${err}`);
                    callback('error', null);
                }
            } else {
                logger.warn(`lambda_sqs_proxy handler: ignoring non-sqs events: ${JSON.stringify(record)}`);
            }
        }
    }
    logger.debug(`lambda_sqs_proxy handler: exit:`);
};
