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
import { injectable } from 'inversify';
import { PathHelper } from '../utils/path.helper';
import { RequestHeaders } from './common.model';
import { ClientServiceBase } from './common.service';
import { Policy, PolicyList } from './policies.model';

export interface PoliciesService {
    createPolicy(body: Policy, additionalHeaders?:RequestHeaders): Promise<void>;

    listInheritedPoliciesByDevice(deviceId: string, type: string, additionalHeaders?:RequestHeaders): Promise<PolicyList>;

    listInheritedPoliciesByGroups(additionalHeaders?:RequestHeaders, ...groupPaths: string[]): Promise<PolicyList>;

    listPolicies(type: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<PolicyList>;

    getPolicy(policyId: string, additionalHeaders?:RequestHeaders): Promise<Policy>;

    patchPolicy(policyId: string, body: Policy, additionalHeaders?:RequestHeaders): Promise<void>;

    deletePolicy(policyId: string, additionalHeaders?:RequestHeaders): Promise<void>;
}

@injectable()
export class PoliciesServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected policiesRelativeUrl(): string {
        return '/policies';
    }

    protected policyRelativeUrl(policyId: string): string {
        return PathHelper.encodeUrl('policies', policyId);
    }

    protected inheritedPoliciesRelativeUrl(): string {
        return '/policies/inherited';
    }
}
