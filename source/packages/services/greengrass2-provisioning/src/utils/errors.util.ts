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
    logger.error(`errors.util handleError: in: ${e}`);

    if (
        e.name === 'ArgumentError' ||
        e.message === 'FAILED_VALIDATION' ||
        e.message === 'UNSUPPORTED_TARGET_TYPE' ||
        e.message.startsWith('INVALID_COMPONENT:')
    ) {
        res.status(400).json({ error: res.statusMessage }).end();
    } else if (e.message?.endsWith('NOT_FOUND')) {
        res.status(404).json({ error: 'Item not found' }).end();
    } else if (e.name === 'ResourceNotFoundException') {
        res.status(404).json({ error: res.statusMessage }).end();
    } else if (
        e.name === 'ConditionalCheckFailedException' ||
        e.name === 'ResourceAlreadyExistsException'
    ) {
        res.status(409).json({ error: 'Item already exists' }).end();
    } else if (e.message === 'SUBSCRIPTION_FOR_USER_PRINCIPAL_ALREADY_EXISTS') {
        res.status(409)
            .json({ error: 'A subscription for this event / user / principal already exists' })
            .end();
    } else if (e.message === 'NOT_SUPPORTED') {
        res.status(415)
            .json({ error: 'Requested action not supported for the requested API version' })
            .end();
    } else if (e.message === 'NOT_IMPLEMENTED') {
        res.status(501).json({ error: 'TODO:  Not yet implemented' }).end();
    } else {
        res.status(500).json({ error: res.statusMessage }).end();
    }

    logger.error(`errors.util handleError: exit: ${res.status}`);
}
