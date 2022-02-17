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
import {
    UpdateDeploymentRequest,
    DeploymentResponse,
    DeploymentTaskRequest,
    DeploymentTaskResponse, ListDeploymentsResponse
} from './deployment.model';

@injectable()
export class DeploymentLambdaService extends DeploymentServiceBase implements DeploymentService {
    
    private functionName : string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.DEVICE_PATCHER_API_FUNCTION_NAME;
    }

    public async createDeploymentTask(deploymentTaskRequest: DeploymentTaskRequest, additionalHeaders?:RequestHeaders): Promise<string> {
        ow(deploymentTaskRequest, ow.object.nonEmpty);
        ow(deploymentTaskRequest.deployments, ow.array.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentTasksRelativeUrl())
            .setPath('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(deploymentTaskRequest)

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        const location = res.header?.location;
        return location.substring(location.lastIndexOf('/') + 1);
    }

    public async getDeployment(deploymentId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentResponse> {
        ow(deploymentId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentsRelativeUrl(deploymentId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getDeploymentTask(taskId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentTaskResponse> {
        ow(taskId, ow.string.nonEmpty);


        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentTaskRelativeUrl(taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async listDeploymentsByTaskId(taskId: string, additionalHeaders?:RequestHeaders): Promise<ListDeploymentsResponse> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentByTaskRelativeUrl(taskId))
            .setQueryStringParameters({status})
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async listDeploymentsByDeviceId(deviceId: string, status?: string, additionalHeaders?:RequestHeaders): Promise<ListDeploymentsResponse> {
        ow(deviceId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentByDeviceRelativeUrl(deviceId))
            .setQueryStringParameters({status})
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async updateDeployment(deploymentRequest: UpdateDeploymentRequest, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deploymentRequest, ow.object.nonEmpty);
        ow(deploymentRequest.deploymentStatus, ow.string.nonEmpty);
        ow(deploymentRequest.deploymentId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentsRelativeUrl(deploymentRequest.deploymentId))
            .setPath('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(deploymentRequest)

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    public async deleteDeployment(deploymentId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deploymentId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentsRelativeUrl(deploymentId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
