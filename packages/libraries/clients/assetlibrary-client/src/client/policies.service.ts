/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

import { Policy, PolicyList } from './policies.model';
import { injectable } from 'inversify';
import ow from 'ow';
import { PathHelper } from '../utils/path.helper';
import { QSHelper } from '../utils/qs.helper';
import * as request from 'superagent';
import { ClientService } from './common.service';

@injectable()
export class PoliciesService extends ClientService {

    public constructor() {
        super();
    }

    public async createPolicy(body:Policy): Promise<void> {
        ow(body, ow.object.nonEmpty);

        await request.post(this.baseUrl + '/policies')
            .send(body)
            .set(super.getHeaders());
    }

    public async listInheritedPoliciesByDevice(deviceId:string, type:string ): Promise<PolicyList> {
        ow(deviceId, ow.string.nonEmpty);
        ow(type, ow.string.nonEmpty);

        const url = `${this.baseUrl}/policies/inherited?deviceId=${encodeURIComponent(deviceId)}&type=${encodeURIComponent(type)}`;
        const res = await request.get(url)
        .set(super.getHeaders());

        return res.body;
    }

    public async listInheritedPoliciesByGroups(...groupPaths: string[] ): Promise<PolicyList> {
        ow(groupPaths, ow.array.nonEmpty);
        ow(groupPaths, ow.array.minLength(1));

        const queryString = groupPaths.map(p=> `groupPath=${encodeURIComponent(p)}`).join('&');
        const url = `${this.baseUrl}/policies/inherited?${queryString}`;
        const res = await request.get(url)
        .set(super.getHeaders());

        return res.body;
    }

    public async listPolicies(type:string, offset?:number, count?:number ): Promise<PolicyList> {
        ow(type, ow.string.nonEmpty);

        const url = `${this.baseUrl}/policies?${QSHelper.getQueryString({type, offset, count})}`;
        const res = await request.get(url)
        .set(super.getHeaders());

        return res.body;
    }

    public async getPolicy(policyId:string ): Promise<Policy> {
        ow(policyId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('policies', policyId);
        const res = await request.get(url)
            .set(super.getHeaders());

        return res.body;
    }

    public async patchPolicy(policyId:string, body:Policy ): Promise<void> {
        ow(policyId, ow.string.nonEmpty);
        ow(body, ow.object.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('policies', policyId);
        await request.patch(url)
            .send(body)
            .set(super.getHeaders());
    }

    public async deletePolicy(policyId:string): Promise<void> {
        ow(policyId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('policies', policyId);
        await request.delete(url)
            .set(super.getHeaders());
    }
}
