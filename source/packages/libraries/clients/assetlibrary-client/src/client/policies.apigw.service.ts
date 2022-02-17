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
import {Policy, PolicyList} from './policies.model';
import {injectable} from 'inversify';
import ow from 'ow';
import {QSHelper} from '../utils/qs.helper';
import * as request from 'superagent';
import {PoliciesService, PoliciesServiceBase} from './policies.service';
import {RequestHeaders} from './common.model';

@injectable()
export class PoliciesApigwService extends PoliciesServiceBase implements PoliciesService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = process.env.ASSETLIBRARY_BASE_URL;
    }

    async createPolicy(body: Policy, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(body, 'body', ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.policiesRelativeUrl()}}`;
        await request.post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));
    }

    async listInheritedPoliciesByDevice(deviceId: string, type: string, additionalHeaders?:RequestHeaders): Promise<PolicyList> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(type,'type', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.inheritedPoliciesRelativeUrl()}?deviceId=${encodeURIComponent(deviceId)}&type=${encodeURIComponent(type)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listInheritedPoliciesByGroups(additionalHeaders?:RequestHeaders, ...groupPaths: string[]): Promise<PolicyList> {
        ow(groupPaths, 'groupPaths',ow.array.nonEmpty.minLength(1));

        const queryString = groupPaths.map(p => `groupPath=${encodeURIComponent(p)}`).join('&');
        const url = `${this.baseUrl}${super.inheritedPoliciesRelativeUrl()}?${queryString}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listPolicies(type: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<PolicyList> {
        ow(type,'type', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.policiesRelativeUrl()}?${QSHelper.getQueryString({type, offset, count})}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getPolicy(policyId: string, additionalHeaders?:RequestHeaders): Promise<Policy> {
        ow(policyId,'policyId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.policyRelativeUrl(policyId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async patchPolicy(policyId: string, body: Policy, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(policyId,'policyId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.policyRelativeUrl(policyId)}`;
        await request.patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));
    }

    async deletePolicy(policyId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(policyId,'policyId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.policyRelativeUrl(policyId)}`;
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }
}
