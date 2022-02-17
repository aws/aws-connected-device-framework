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
import {inject, injectable} from 'inversify';
import ow from 'ow';
import {RequestHeaders} from './common.model';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';
import { MessagesDebugService, MessagesDebugServiceBase } from './messages.service';
import { SimulateIoTCoreMessageRequest } from './messages.model';

@injectable()
export class MessagesDebugLambdaService extends MessagesDebugServiceBase implements MessagesDebugService {

    private functionName : string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.NOTIFICATIONS_API_FUNCTION_NAME;
    }

    async simulateIoTCoreMessage(message:SimulateIoTCoreMessageRequest, additionalHeaders?: RequestHeaders
        ): Promise<void> {
            ow(message, ow.object.nonEmpty);
            ow(message.topic, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.iotcoreRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(message);

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

}
