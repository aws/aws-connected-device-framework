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
import { RequestHeaders } from './common.model';
import { SimulateIoTCoreMessageRequest } from './messages.model';
import { MessagesDebugService, MessagesDebugServiceBase } from './messages.service';

@injectable()
export class MessagesDebugApigwService
    extends MessagesDebugServiceBase
    implements MessagesDebugService
{
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.NOTIFICATIONS_BASE_URL;
    }

    async simulateIoTCoreMessage(
        message: SimulateIoTCoreMessageRequest,
        additionalHeaders?: RequestHeaders,
    ): Promise<void> {
        ow(message, ow.object.nonEmpty);
        ow(message.topic, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.iotcoreRelativeUrl()}`;
        return await request
            .post(url)
            .send(message)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
