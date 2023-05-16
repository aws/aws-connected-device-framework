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

import { signClientRequest } from '@aws-solutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import {
    CertificateBatchRequest,
    CertificateBatchTask,
    RequestHeaders,
} from './certificatestask.models';
import { CertificatesTaskService, CertificatesTaskServiceBase } from './certificatestask.service';

@injectable()
export class CertificatesTaskApigwService
    extends CertificatesTaskServiceBase
    implements CertificatesTaskService
{
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.BULKCERTS_BASEURL;
    }

    async createCertificateTask(
        batchRequest: CertificateBatchRequest,
        caAlias: string,
        additionalHeaders?: RequestHeaders
    ): Promise<CertificateBatchTask> {
        ow(caAlias, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.certificateTaskCreateRelativeUrl(caAlias)}`;
        return await request
            .post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(batchRequest)
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
