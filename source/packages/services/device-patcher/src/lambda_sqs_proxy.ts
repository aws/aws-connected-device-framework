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
import { logger } from '@awssolutions/simple-cdf-logger';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';
import { PatchItem } from './patch/patch.model';
import { PatchService } from './patch/patch.service';

const patchService: PatchService = container.get<PatchService>(TYPES.PatchService);

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
exports.handler = async (event: any, _context: any, callback: any) => {
    logger.debug(`event: ${JSON.stringify(event)}`);

    if (event.Records) {
        for (const record of event.Records) {
            if (record.eventSource === 'aws:sqs') {
                const patch: PatchItem = JSON.parse(record.body);
                try {
                    await patchService.deploy(patch);
                } catch (err) {
                    logger.error(`patchService.deploy: in: ${patch} err: ${err}`);
                    callback('error', null);
                }
            } else {
                logger.warn(
                    `lambda_sqs_proxy handler: ignoring non-sqs events: ${JSON.stringify(record)}`,
                );
            }
        }
    }
    logger.debug(`lambda_sqs_proxy handler: exit:`);
};
