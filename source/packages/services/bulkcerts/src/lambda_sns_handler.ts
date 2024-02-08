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
import { container } from './di/inversify.config';

import { logger } from '@awssolutions/simple-cdf-logger';
import { Context, SNSEvent } from 'aws-lambda';
import ow from 'ow';
import { CertificateChunkRequest } from './certificates/certificates.models';
import { CertificatesService } from './certificates/certificates.service';
import { TYPES } from './di/types';

let service: CertificatesService;

exports.handler = async (event: SNSEvent, _context: Context) => {
    logger.debug(`handler: event: ${JSON.stringify(event)}`);

    ow(event.Records, ow.array.nonEmpty);
    ow(event.Records[0].EventSource, ow.string.equals('aws:sns'));

    if (service === undefined) {
        service = container.get(TYPES.CertificatesService);
    }

    const chunkRequest: CertificateChunkRequest = JSON.parse(event.Records[0].Sns.Message);
    logger.debug(`chunkRequest: ${JSON.stringify(chunkRequest)}`);
    await service.createChunk(chunkRequest);

    logger.debug('handler: exit:');
};
