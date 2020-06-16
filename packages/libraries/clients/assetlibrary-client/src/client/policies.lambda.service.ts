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
        ow(body, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.policiesRelativeUrl())
            .setMethod('POST')
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async listInheritedPoliciesByDevice(deviceId: string, type: string, additionalHeaders?:RequestHeaders): Promise<PolicyList> {
        ow(deviceId, ow.string.nonEmpty);
        ow(type, ow.string.nonEmpty);

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
        ow(groupPaths, ow.array.nonEmpty);
        ow(groupPaths, ow.array.minLength(1));

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
        ow(type, ow.string.nonEmpty);

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
        ow(policyId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.policiesRelativeUrl())
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async patchPolicy(policyId: string, body: Policy, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(policyId, ow.string.nonEmpty);
        ow(body, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.policyRelativeUrl(policyId))
            .setMethod('PATCH')
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async deletePolicy(policyId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(policyId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.policyRelativeUrl(policyId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
