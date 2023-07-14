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
import { ActivationResponse } from './activation.model';
import { ActivationService, ActivationServiceBase } from './activation.service';
import { RequestHeaders } from './common.model';

@injectable()
export class ActivationLambdaService extends ActivationServiceBase implements ActivationService {
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService,
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.DEVICE_PATCHER_API_FUNCTION_NAME;
    }

    public async createActivation(
        deviceId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<ActivationResponse> {
        ow(deviceId, ow.string.nonEmpty);

        const requestBody = {
            deviceId,
        };

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.activationsRelativeUrl())
            .setPath('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(requestBody);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getActivation(
        activationId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<ActivationResponse> {
        ow(activationId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.activationsByIdRelativeUrl(activationId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async deleteActivation(
        activationId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<void> {
        ow(activationId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.activationsByIdRelativeUrl(activationId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
