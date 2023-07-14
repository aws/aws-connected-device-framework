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
import { Response } from 'express';
import { logger } from '@awssolutions/simple-cdf-logger';

export function handleError(e: Error, res: Response): void {
    logger.error(`handleError: ${e}`);

    if (
        e.name === 'ArgumentError' ||
        e.message === 'FAILED_VALIDATION' ||
        e.message.startsWith('REGISTRATION_FAILED:') ||
        e.message.startsWith('INVALID_PROVISIONING_TEMPLATE:')
    ) {
        res.status(400).json({ error: res.statusMessage }).end();
    } else if (e.message === 'NOT_FOUND' || e.name === 'ResourceNotFoundException') {
        res.status(404).json({ error: 'Resource does not exist' }).end();
    } else {
        res.status(500).json({ error: res.statusMessage }).end();
    }

    logger.error(`handleError: res.status: ${res.statusCode} ${res.statusMessage}`);
}
