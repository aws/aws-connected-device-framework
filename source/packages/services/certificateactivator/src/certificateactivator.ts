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
import { getRequestIdFromContext, logger, setRequestId } from '@awssolutions/simple-cdf-logger';
import ow from 'ow';
import { RegistrationEvent } from './activation/activation.models';
import { ActivationService } from './activation/activation.service';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';

let service: ActivationService;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.handler = async (event: any, _context: any) => {
    logger.debug(`handler: event: ${JSON.stringify(event)}`);
    setRequestId(getRequestIdFromContext(_context));

    try {
        ow(event.certificateId, ow.string.nonEmpty);
        ow(event.caCertificateId, ow.string.nonEmpty);
        ow(event.timestamp, ow.number.integer);
        ow(event.awsAccountId, ow.string.nonEmpty);
    } catch (e) {
        // validation errors shoudn't be retried by Lambda, so
        // log an error and then return something instead of passing the error up
        logger.error(`Validation error ${JSON.stringify(e)} on event: ${JSON.stringify(event)}`);
        return { status: 'error', message: 'VALIDATION_ERROR' };
    }

    let registrationMessage: RegistrationEvent;
    try {
        registrationMessage = JSON.parse(JSON.stringify(event));
        logger.debug(`registrationMessage: ${JSON.stringify(registrationMessage)}`);
    } catch (e) {
        // parsing errors shoudn't be retried by Lambda, so
        // log an error and then return something instead of passing the error up
        logger.error(`Error ${JSON.stringify(e)} parsing event: ${JSON.stringify(event)}`);
        return { status: 'error', message: 'PARSING_ERROR' };
    }

    if (service === undefined) {
        service = container.get(TYPES.ActivationService);
    }

    await service.activate(registrationMessage);

    logger.debug('handler: exit:');
    return { status: 'success' };
};
