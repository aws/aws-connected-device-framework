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
import { QSHelper } from '../utils/qs.helper';
import { RequestHeaders } from './common.model';
import { Policy, PolicyList } from './policies.model';
import { PoliciesService, PoliciesServiceBase } from './policies.service';

@injectable()
export class PoliciesApigwService extends PoliciesServiceBase implements PoliciesService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.ASSETLIBRARY_BASE_URL;
    }

    async createPolicy(body: Policy, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(body, 'body', ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.policiesRelativeUrl()}}`;
        return await request
            .post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listInheritedPoliciesByDevice(
        deviceId: string,
        type: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<PolicyList> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(type, 'type', ow.string.nonEmpty);

        const url = `${
            this.baseUrl
        }${super.inheritedPoliciesRelativeUrl()}?deviceId=${encodeURIComponent(
            deviceId,
        )}&type=${encodeURIComponent(type)}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listInheritedPoliciesByGroups(
        additionalHeaders?: RequestHeaders,
        ...groupPaths: string[]
    ): Promise<PolicyList> {
        ow(groupPaths, 'groupPaths', ow.array.nonEmpty.minLength(1));

        const queryString = groupPaths.map((p) => `groupPath=${encodeURIComponent(p)}`).join('&');
        const url = `${this.baseUrl}${super.inheritedPoliciesRelativeUrl()}?${queryString}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listPolicies(
        type: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders,
    ): Promise<PolicyList> {
        ow(type, 'type', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.policiesRelativeUrl()}?${QSHelper.getQueryString({
            type,
            offset,
            count,
        })}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getPolicy(policyId: string, additionalHeaders?: RequestHeaders): Promise<Policy> {
        ow(policyId, 'policyId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.policyRelativeUrl(policyId)}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async patchPolicy(
        policyId: string,
        body: Policy,
        additionalHeaders?: RequestHeaders,
    ): Promise<void> {
        ow(policyId, 'policyId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.policyRelativeUrl(policyId)}`;
        return await request
            .patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deletePolicy(policyId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(policyId, 'policyId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.policyRelativeUrl(policyId)}`;
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
