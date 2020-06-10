import {Policy, PolicyList} from './policies.model';
import {RequestHeaders} from './common.model';
import {ClientServiceBase} from './common.service';
import {PathHelper} from '../utils/path.helper';
import {injectable} from 'inversify';

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
