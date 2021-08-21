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
import { logger } from './utils/logger';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { RenewerService } from './renewer/renewer.service';
import { NotificationEvent } from './renewer/renewer.models';
import { SNSEvent, Context } from 'aws-lambda';

let service:RenewerService;

exports.handler = async (event: SNSEvent, context: Context) => {
    logger.debug(`handler: SNS Event: ${JSON.stringify(event)}`);
    logger.debug(`context: ${JSON.stringify(context)}`);
    let notificationMessage:NotificationEvent;
    try {
        notificationMessage = JSON.parse(event.Records[0].Sns.Message);
        logger.debug(`notificationMessage: ${JSON.stringify(notificationMessage)}`);
    } catch(e) {
        logger.error(`Parsing errors ${JSON.stringify(e)}`);
        throw Error(`Notification event parsing error`);
    }
    if (service===undefined) {
        service = container.get(TYPES.RenewerService);
    }
    await service.processNotification(notificationMessage);
    logger.debug('Successfully completed execution');
};
