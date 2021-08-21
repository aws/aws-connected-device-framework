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
