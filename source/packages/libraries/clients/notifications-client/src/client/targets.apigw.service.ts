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
import { TargetResource } from './targets.model';
import { TargetsService, TargetsServiceBase } from './targets.service';

@injectable()
export class TargetsApigwService extends TargetsServiceBase implements TargetsService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.NOTIFICATIONS_BASE_URL;
    }

    async createTarget(
        subscriptionId: string,
        targetType: string,
        target: TargetResource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(target, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.targetsRelativeUrl(subscriptionId, targetType)}`;
        await request
            .post(url)
            .send(target)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteTarget(
        subscriptionId: string,
        targetType: string,
        targetId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(targetId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.targetRelativeUrl(
            subscriptionId,
            targetType,
            targetId
        )}`;
        return await request
            .delete(url)
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

