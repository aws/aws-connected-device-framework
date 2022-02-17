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
import ow from 'ow';
import * as request from 'superagent';

import { QSHelper } from '../utils/qs.helper';
import { RequestHeaders } from './common.model';
import {
    DeploymentResponse,
    DeploymentTaskRequest,
    DeploymentTaskResponse, ListDeploymentsResponse, UpdateDeploymentRequest
} from './deployment.model';
import { DeploymentService, DeploymentServiceBase } from './deployment.service';


@injectable()
export class DeploymentApigwService extends DeploymentServiceBase implements DeploymentService {
    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = process.env.DEVICE_PATCHER_BASE_URL;
    }

    public async createDeploymentTask(deploymentTaskRequest: DeploymentTaskRequest, additionalHeaders?:RequestHeaders): Promise<string> {
        ow(deploymentTaskRequest, ow.object.nonEmpty);
        ow(deploymentTaskRequest.deployments, ow.array.nonEmpty);

        const res = await request.post(`${this.baseUrl}${super.deploymentTasksRelativeUrl()}`)
            .set(super.buildHeaders(additionalHeaders))
            .send(deploymentTaskRequest);

        const location = res.get('Location');
        return location.substring(location.lastIndexOf('/') + 1);
    }

    public async getDeployment(deploymentId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentResponse> {
        ow(deploymentId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentsRelativeUrl(deploymentId)}`;
        const res = await request.get(url).set(super.buildHeaders(additionalHeaders));

        return res.body;
    }

    public async getDeploymentTask(taskId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentTaskResponse> {
        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentTaskRelativeUrl(taskId)}`;
        const res = await request.get(url).set(super.buildHeaders(additionalHeaders));

        return res.body;
    }

    public async listDeploymentsByTaskId(taskId: string, additionalHeaders?:RequestHeaders): Promise<ListDeploymentsResponse> {
        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentByTaskRelativeUrl(taskId)}`;
        const res = await request.get(url).set(super.buildHeaders(additionalHeaders));

        return res.body;
    }

    public async listDeploymentsByDeviceId(deviceId: string, status?: string, additionalHeaders?:RequestHeaders): Promise<ListDeploymentsResponse> {
        ow(deviceId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.deploymentByDeviceRelativeUrl(deviceId)}`;

        const queryString = QSHelper.getQueryString({status});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url).set(super.buildHeaders(additionalHeaders));
        return res.body;
    }

    public async updateDeployment(deploymentRequest: UpdateDeploymentRequest, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deploymentRequest, ow.object.nonEmpty);
        ow(deploymentRequest.deploymentStatus, ow.string.nonEmpty);
        ow(deploymentRequest.deploymentId, ow.string.nonEmpty);

        const res = await request.post(`${this.baseUrl}${super.deploymentsRelativeUrl(deploymentRequest.deploymentId)}`)
            .set(super.buildHeaders(additionalHeaders))
            .send(deploymentRequest);

        return res.body;
    }

    public async deleteDeployment(deploymentId:string,  additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deploymentId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentsRelativeUrl(deploymentId)}`;
        await request.delete(url).set(super.buildHeaders(additionalHeaders));

    }
}
