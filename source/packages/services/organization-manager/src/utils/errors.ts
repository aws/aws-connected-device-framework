/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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

// https://github.com/aws/aws-sdk-net/issues/1495
const ERRORS_429 = [
    'ProvisionedThroughputExceededException',
    'RequestTimeout',
    'RequestThrottledException',
    'Throttling',
    'ThrottlingException',
    'TooManyRequestsException',
];

export function handleError(e: ErrorWithResponse, res: Response): void {
    logger.error(`handleError: ${e}`);

    let message = res.statusMessage;
    const code = e.code;
    let status;
    if (e.response !== undefined) {
        status = e.response.status;
        const json = JSON.parse(e.response.text);
        if (json['error']) {
            message = json['error'];
        }
    }

    if (status === 400) {
        res.status(400).json({ error: message }).end();
    } else if (
        e.name === 'ArgumentError' || // ow input validation error
        e.message === 'FAILED_VALIDATION' ||
        e.message === 'STATUS_PENDING' ||
        e.message === 'INVALID_RELATION'
    ) {
        res.status(400).json({ error: res.statusMessage }).end();
    } else if (status === 404 || e.message === 'NOT_FOUND') {
        res.status(404).json({ error: 'Resource does not exist' }).end();
    } else if (e.message === 'Organizational Unit exists') {
        res.status(409).json({ error: res.statusMessage }).end();
    } else if (status === 409 || code === 'DuplicateOrganizationalUnitException') {
        res.status(409).json({ error: message }).end();
    } else if (e.hasOwnProperty('code') && ERRORS_429.includes(e['code'])) {
        res.status(429).end();
    } else {
        // NO_PROVISIONING_TEMPLATE_CONFIGURED
        // NO_ROOT_CA_CONFIGURED
        // NO_ROOT_CA_CERTIFICATE_PEM
        res.status(500).json({ error: message }).end();
    }

    logger.error(`handleError: res.status: ${res.status}`);
}

export interface ErrorWithResponse extends Error {
    code?: string;
    response?: {
        status: number;
        text: string;
    };
}
