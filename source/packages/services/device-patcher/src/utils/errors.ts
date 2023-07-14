/********************************************************************************************************************
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

// https://github.com/aws/aws-sdk-net/issues/1495
const ERRORS_429 = [
    'ProvisionedThroughputExceededException',
    'RequestTimeout',
    'RequestThrottledException',
    'Throttling',
    'ThrottlingException',
    'TooManyRequestsException',
];

export function handleError(e: Error, res: Response): void {
    logger.error(`handleError: ${e}`);

    if (
        e.message.startsWith('MISSING_REQUIRED') ||
        e.message === 'FAILED_VALIDATION' ||
        e.message === 'UNSUPPORTED_TRANSITION' ||
        e.message === 'UNSUPPORTED_PATCH_STATUS' ||
        e.message === 'BAD_REQUEST' ||
        (e.hasOwnProperty('code') && e['code'] === 'ValidationException')
    ) {
        res.status(400).json({ error: res.statusMessage }).end();
    } else if (e.name === 'ArgumentError') {
        // ow input validation error
        res.status(400).json({ error: res.statusMessage }).end();
    } else if (e.message.endsWith('NOT_FOUND')) {
        res.status(404).json({ error: 'Item not found' }).end();
    } else if (e.name === 'ResourceNotFoundException') {
        res.status(404).json({ error: res.statusMessage }).end();
    } else if (e.name === 'ConditionalCheckFailedException' || e.message === 'CONFLICT') {
        res.status(409).json({ error: 'Item already exists' }).end();
    } else if (e.message === 'DEVICE_NOT_ACTIVATED_AS_HYBRID_INSTANCE') {
        res.status(409).json({ error: res.statusMessage });
    } else if (e.hasOwnProperty('code') && ERRORS_429.includes(e['code'])) {
        res.status(429).end();
    } else {
        res.status(500).json({ error: res.statusMessage }).end();
    }

    logger.error(`handleError: res.status: ${res.status}`);
}
