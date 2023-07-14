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
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import {
    CertificateBatchRequest,
    CertificateBatchTask,
    RequestHeaders,
} from './certificatestask.models';
import { CertificatesTaskService, CertificatesTaskServiceBase } from './certificatestask.service';

@injectable()
export class CertificatesTaskLambdaService
    extends CertificatesTaskServiceBase
    implements CertificatesTaskService
{
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService,
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.BULKCERTS_API_FUNCTION_NAME;
    }

    async createCertificateTask(
        batchRequest: CertificateBatchRequest,
        caAlias: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<CertificateBatchTask> {
        ow(caAlias, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.certificateTaskCreateRelativeUrl(caAlias))
            .setMethod('POST')
            .setBody(batchRequest)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
