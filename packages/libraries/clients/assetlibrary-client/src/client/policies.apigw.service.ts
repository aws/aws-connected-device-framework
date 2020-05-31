/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

import {Policy, PolicyList} from './policies.model';
import {injectable} from 'inversify';
import config from 'config';
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
        this.baseUrl = config.get('assetLibrary.baseUrl') as string;
    }

    async createPolicy(body: Policy, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(body, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.policiesRelativeUrl()}}`;
        await request.post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));
    }

    async listInheritedPoliciesByDevice(deviceId: string, type: string, additionalHeaders?:RequestHeaders): Promise<PolicyList> {
        ow(deviceId, ow.string.nonEmpty);
        ow(type, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.inheritedPoliciesRelativeUrl()}?deviceId=${encodeURIComponent(deviceId)}&type=${encodeURIComponent(type)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listInheritedPoliciesByGroups(additionalHeaders?:RequestHeaders, ...groupPaths: string[]): Promise<PolicyList> {
        ow(groupPaths, ow.array.nonEmpty);
        ow(groupPaths, ow.array.minLength(1));

        const queryString = groupPaths.map(p => `groupPath=${encodeURIComponent(p)}`).join('&');
        const url = `${this.baseUrl}${super.inheritedPoliciesRelativeUrl()}?${queryString}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listPolicies(type: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<PolicyList> {
        ow(type, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.policiesRelativeUrl()}?${QSHelper.getQueryString({type, offset, count})}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getPolicy(policyId: string, additionalHeaders?:RequestHeaders): Promise<Policy> {
        ow(policyId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.policyRelativeUrl(policyId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async patchPolicy(policyId: string, body: Policy, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(policyId, ow.string.nonEmpty);
        ow(body, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.policyRelativeUrl(policyId)}`;
        await request.patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));
    }

    async deletePolicy(policyId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(policyId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.policyRelativeUrl(policyId)}`;
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }
}
