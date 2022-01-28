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
import { logger } from './logger';

export function handleError(e:ErrorWithResponse, res:Response): void {
    logger.error(`handleError: ${e}`);

    let message = e.message;
    let status;
    if (e.response!==undefined) {
        status=e.response.status;
        const json = JSON.parse(e.response.text);
        if (json['error']) {
            message = json['error'];
        }
    }

    if (status===400 || e.name=== 'ArgumentError' || message === 'FAILED_VALIDATION' || message === 'STATUS_PENDING' || message === 'INVALID_RELATION') {
        res.status(400).json({error: message}).end();

    } else if (status===404 || message === 'NOT_FOUND') {
        res.status(404).json({error: 'Resource does not exist'}).end();

    } else if (status===409) {
        res.status(409).json({error: message}).end();

    } else {
        // NO_PROVISIONING_TEMPLATE_CONFIGURED
        // NO_ROOT_CA_CONFIGURED
        // NO_ROOT_CA_CERTIFICATE_PEM
        res.status(500).json({error: message}).end();
    }

    logger.error(`handleError: res.status: ${res.statusCode} ${res.statusMessage}`);
}

interface ErrorWithResponse extends Error {
    response?: {
        status: number;
        text: string;
    };
}
