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
import {Context, SQSEvent} from 'aws-lambda';
import {logger} from './utils/logger';
import {
     AuditNextPageRequest,
     BatchType,
     CertificateList,
     DeviceNextPageRequest,
     SqsRequestList
} from './renewer/renewer.models';
import {container} from './di/inversify.config';
import {TYPES} from './di/types';
import {ProcessorService} from './renewer/processor.service';
import {RenewerService} from './renewer/renewer.service';

let processService:ProcessorService;
let renewService:RenewerService;

exports.handler = async (event: SQSEvent, context: Context) => {
    logger.debug(`handler: SQS Event: ${JSON.stringify(event)}`);
    logger.debug(`context: ${JSON.stringify(context)}`);
    try {
        logger.debug(`Event Body: ${JSON.stringify(event.Records[0].body)}`);
        const eventBody = JSON.parse(event.Records[0].body);
        logger.debug(`${JSON.stringify(eventBody)}`);
        logger.debug(`${eventBody['batchType'].toString()}`);
        if (renewService===undefined) {
            renewService = container.get(TYPES.RenewerService);
        }
        if (processService===undefined) {
            processService = container.get(TYPES.ProcessorService);
        }
        switch (eventBody['batchType'].toString()) {
            case BatchType.EXPIRINGCERTIFICATE: {
                logger.debug(`Expiring certificate list processing`);
                const certificateList: CertificateList = JSON.parse(event.Records[0].body);
                await renewService.processNextExpiringCertificate(certificateList);
                break;
            }
            case BatchType.NEXTDEVICEPAGE: {
                const deviceNextPageRequest: DeviceNextPageRequest = JSON.parse(event.Records[0].body);
                logger.debug(`Device NextPage Request: ${JSON.stringify(deviceNextPageRequest)}`);
                await renewService.processNextDevicePage(deviceNextPageRequest);
                break;
            }
            case BatchType.NEXTAUDITPAGE: {
                const auditNextPageRequest: AuditNextPageRequest = JSON.parse(event.Records[0].body);
                logger.debug(`Audit next page Request: ${JSON.stringify(auditNextPageRequest)}`);
                await renewService.processNextAuditPage(auditNextPageRequest);
                break;
            }
            case BatchType.READYPROCESSING: {
                const sqsRequestList: SqsRequestList = JSON.parse(event.Records[0].body);
                logger.debug(`notificationMessage: ${JSON.stringify(sqsRequestList)}`);
                await processService.processNotification(sqsRequestList);
                break;
            }
            default:
                logger.debug(`Invalid Batch Type : ${eventBody['batchType'].toString()}`);
                break;
        }
    } catch(e) {
        logger.error(`Parsing errors ${JSON.stringify(e)}`);
        logger.error(`StackTrace: ${JSON.stringify(e.stack)}`);
        throw Error(`Notification event parsing error`);
    }
    logger.debug('Successfully completed execution');
};
