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
import { Response } from 'express';

export function handleError(e: Error, res: Response): void {
    logger.error(`handleError: ${e}`);

    if (
        e.name === 'ArgumentError' ||
        e.message.startsWith('MISSING_REQUIRED') ||
        e.message.startsWith('FAILED_VALIDATION') ||
        e.message === 'UNSUPPORTED_TRANSITION' ||
        (e.hasOwnProperty('code') && e['code'] === 'ValidationException')
    ) {
        res.status(400).json({ error: res.statusMessage }).end();
    } else if (e.message.startsWith('NOT_FOUND')) {
        res.status(404).json({ error: res.statusMessage }).end();
    } else if (e.name === 'ResourceNotFoundException') {
        res.status(404).json({ error: res.statusMessage }).end();
    } else if (
        e.name === 'ConditionalCheckFailedException' ||
        e.message.indexOf('with id already exists') >= 0
    ) {
        res.status(409).json({ error: 'Item already exists' }).end();
    } else if (e.message === 'TEMPLATE_IN_USE') {
        res.status(409).json({ error: 'Template in use' }).end();
    } else {
        res.status(500).json({ error: res.statusMessage }).end();
    }

    logger.error(`handleError: res.status: ${res.status}`);
}
