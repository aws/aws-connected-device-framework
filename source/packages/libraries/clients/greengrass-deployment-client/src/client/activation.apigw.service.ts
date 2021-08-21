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

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';

import {RequestHeaders} from './common.model';
import {ActivationService, ActivationServiceBase} from './activation.service';
import {ActivationResponse} from './activation.model';


@injectable()
export class ActivationApigwService extends ActivationServiceBase implements ActivationService {
    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassDeployment.baseUrl') as string;
    }

    async createActivation(deviceId: string, additionalHeaders?:RequestHeaders): Promise<ActivationResponse> {
        ow(deviceId, ow.string.nonEmpty);

        const requestBody = {
            deviceId
        }

        const res = await request.post(`${this.baseUrl}${super.activationsRelativeUrl(deviceId)}`)
            .set(super.buildHeaders(additionalHeaders))
            .send(requestBody);

        return res.body;
    }

    async getActivation(activationId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<ActivationResponse> {
        ow(deviceId, ow.string.nonEmpty);
        ow(activationId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.activationsByIdRelativeUrl(activationId, deviceId)}`;
        const res = await request.get(url).set(super.buildHeaders(additionalHeaders));

        return res.body;
    }

    async deleteActivation(activationId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(activationId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.activationsByIdRelativeUrl(activationId, deviceId)}`;
        await request.delete(url).set(super.buildHeaders(additionalHeaders));
    }
}
