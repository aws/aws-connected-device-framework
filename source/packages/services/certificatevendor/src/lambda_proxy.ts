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
import { Action, CertificateRequestModel } from './certificates/certificates.models';
import { CertificateService } from './certificates/certificates.service';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';
import { handleError } from './utils/errors';

let service: CertificateService;

exports.handler = async (event: CertificateRequestModel, _context: unknown) => {
    logger.debug(`handler: event: ${JSON.stringify(event)}`);

    // apply the awsRequestId to the logger so all logs reflect the requestId
    setRequestId(getRequestIdFromContext(_context));

    try {
        ow(event.deviceId, ow.string.nonEmpty);
        ow(event.action, ow.string.nonEmpty);
        ow(event.certId, ow.string.nonEmpty);

        if (service === undefined) {
            service = container.get(TYPES.CertificateService);
        }

        if (event.action === Action.get) {
            if (event.csr !== undefined) {
                ow(event.csr, ow.string.nonEmpty);
                const previousCertificateId = event?.previousCertificateId
                    ? event?.previousCertificateId
                    : null;
                await service.getWithCsr(event.deviceId, event.csr, previousCertificateId);
            } else {
                await service.get(event.deviceId);
            }
        } else if (event.action === Action.ack) {
            const previousCertificateId = event?.previousCertificateId
                ? event?.previousCertificateId
                : null;
            await service.ack(event.deviceId, event.certId, previousCertificateId);
        } else {
            logger.error(`Unrecognized action: ${event.action}`);
        }
    } catch (e) {
        handleError(e);
    }

    logger.debug('handler: exit:');
};
