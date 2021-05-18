/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import ow from 'ow';
import { injectable, inject } from 'inversify';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';

import {RequestHeaders} from './common.model';
import {DeploymentServiceBase, DeploymentService} from './deployment.service';
import {DeploymentRequest, DeploymentResponse, DeploymentResponseList} from './deployment.model';

@injectable()
export class DeploymentLambdaService extends DeploymentServiceBase implements DeploymentService {
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('greengrassDeployment.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    public async createDeployment(deploymentRequest: DeploymentRequest, additionalHeaders?:RequestHeaders): Promise<DeploymentResponse> {
        ow(deploymentRequest, ow.object.nonEmpty);
        ow(deploymentRequest.deploymentTemplateName, ow.string.nonEmpty);
        ow(deploymentRequest.deviceId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentRelativeUrl(deploymentRequest.deviceId))
            .setPath('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(deploymentRequest)

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getDeployment(deploymentId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentResponse> {
        ow(deploymentId, ow.string.nonEmpty);
        ow(deviceId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentByDeviceRelativeUrl(deploymentId, deviceId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async listDeploymentsByDeviceId(deviceId: string, status?: string, additionalHeaders?:RequestHeaders): Promise<DeploymentResponseList> {
        ow(deviceId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentRelativeUrl(deviceId))
            .setQueryStringParameters({status})
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async updateDeployment(deploymentRequest: DeploymentRequest, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deploymentRequest, ow.object.nonEmpty);
        ow(deploymentRequest.deploymentStatus, ow.string.nonEmpty);
        ow(deploymentRequest.deviceId, ow.string.nonEmpty);
        ow(deploymentRequest.deploymentId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentByDeviceRelativeUrl(deploymentRequest.deploymentId, deploymentRequest.deviceId))
            .setPath('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(deploymentRequest)

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    public async deleteDeployment(deploymentId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deploymentId, ow.string.nonEmpty);
        ow(deviceId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentByDeviceRelativeUrl(deploymentId, deviceId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
