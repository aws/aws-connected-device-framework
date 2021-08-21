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
import {inject, injectable} from 'inversify';
import ow from 'ow';
import {PoliciesService, PoliciesServiceBase} from './policies.service';
import {RequestHeaders} from './common.model';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';

@injectable()
export class PoliciesLambdaService extends PoliciesServiceBase implements PoliciesService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('assetLibrary.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createPolicy(body: Policy, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.policiesRelativeUrl())
            .setMethod('POST')
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async listInheritedPoliciesByDevice(deviceId: string, type: string, additionalHeaders?:RequestHeaders): Promise<PolicyList> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(type,'type', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.inheritedPoliciesRelativeUrl())
            .setQueryStringParameters({
                deviceId, type
            })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listInheritedPoliciesByGroups(additionalHeaders?:RequestHeaders, ...groupPaths: string[]): Promise<PolicyList> {
        ow(groupPaths, 'groupPaths',ow.array.nonEmpty);
        ow(groupPaths, 'groupPaths',ow.array.minLength(1));

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.inheritedPoliciesRelativeUrl())
            .setMultiValueQueryStringParameters({
                groupPath: groupPaths
            })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;

    }

    async listPolicies(type: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<PolicyList> {
        ow(type,'type', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.policiesRelativeUrl())
            .setQueryStringParameters({
                type,
                offset: `${offset}`,
                count: `${count}`
            })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getPolicy(policyId: string, additionalHeaders?:RequestHeaders): Promise<Policy> {
        ow(policyId,'policyId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.policiesRelativeUrl())
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async patchPolicy(policyId: string, body: Policy, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(policyId,'policyId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.policyRelativeUrl(policyId))
            .setMethod('PATCH')
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async deletePolicy(policyId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(policyId,'policyId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.policyRelativeUrl(policyId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
