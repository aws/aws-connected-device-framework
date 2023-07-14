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

import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { CertificateBatchTaskWithChunks, RequestHeaders } from './certificates.models';
import { CertificatesService, CertificatesServiceBase } from './certificates.service';

@injectable()
export class CertificatesApigwService
    extends CertificatesServiceBase
    implements CertificatesService
{
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.BULKCERTS_BASEURL;
    }

    async getCertificates(
        taskId: string,
        downloadType: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<string[] | Buffer> {
        ow(taskId, ow.string.nonEmpty);

        return await request
            .get(
                `${this.baseUrl}${super.getCertificatesRelativeUrl(
                    taskId,
                )}?downloadType=${downloadType}`,
            )
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getCertificatesTask(
        taskId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<CertificateBatchTaskWithChunks> {
        ow(taskId, ow.string.nonEmpty);

        return await request
            .get(`${this.baseUrl}${super.getCertificatesTaskRelativeUrl(taskId)}`)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
