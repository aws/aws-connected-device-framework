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

import {
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@cdf/lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { CertificateBatchTaskWithChunks, RequestHeaders } from './certificates.models';
import { CertificatesService, CertificatesServiceBase } from './certificates.service';

@injectable()
export class CertificatesLambdaService
    extends CertificatesServiceBase
    implements CertificatesService
{
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.BULKCERTS_API_FUNCTION_NAME;
    }

    async getCertificates(
        taskId: string,
        downloadType: string,
        additionalHeaders?: RequestHeaders
    ): Promise<string[] | Buffer> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(`${super.getCertificatesRelativeUrl(taskId)}`)
            .setQueryStringParameters({ downloadType: downloadType })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getCertificatesTask(
        taskId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<CertificateBatchTaskWithChunks> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.getCertificatesTaskRelativeUrl(taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
