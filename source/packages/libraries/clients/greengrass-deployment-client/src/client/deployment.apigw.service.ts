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

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';

import {RequestHeaders} from './common.model';
import {DeploymentServiceBase, DeploymentService} from './deployment.service';
import {DeploymentRequest, DeploymentResponse, DeploymentResponseList} from './deployment.model';
import {QSHelper} from '../utils/qs.helper';

@injectable()
export class DeploymentApigwService extends DeploymentServiceBase implements DeploymentService {
    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassDeployment.baseUrl') as string;
    }

    public async createDeployment(deploymentRequest: DeploymentRequest, additionalHeaders?:RequestHeaders): Promise<DeploymentResponse> {
        ow(deploymentRequest, ow.object.nonEmpty);
        ow(deploymentRequest.deploymentTemplateName, ow.string.nonEmpty);
        ow(deploymentRequest.deviceId, ow.string.nonEmpty);

        const res = await request.post(`${this.baseUrl}${super.deploymentRelativeUrl(deploymentRequest.deviceId)}`)
            .set(super.buildHeaders(additionalHeaders))
            .send(deploymentRequest);

        return res.body;
    }

    public async getDeployment(deploymentId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentResponse> {
        ow(deploymentId, ow.string.nonEmpty);
        ow(deviceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentByDeviceRelativeUrl(deploymentId, deviceId)}`;
        const res = await request.get(url).set(super.buildHeaders(additionalHeaders));

        return res.body;
    }

    public async listDeploymentsByDeviceId(deviceId: string, status?: string, additionalHeaders?:RequestHeaders): Promise<DeploymentResponseList> {
        ow(deviceId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.deploymentRelativeUrl(deviceId)}`;

        const queryString = QSHelper.getQueryString({status});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url).set(super.buildHeaders(additionalHeaders));
        return res.body;
    }

    public async updateDeployment(deploymentRequest: DeploymentRequest, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deploymentRequest, ow.object.nonEmpty);
        ow(deploymentRequest.deploymentStatus, ow.string.nonEmpty);
        ow(deploymentRequest.deviceId, ow.string.nonEmpty);
        ow(deploymentRequest.deploymentId, ow.string.nonEmpty);

        const res = await request.post(`${this.baseUrl}${super.deploymentByDeviceRelativeUrl(deploymentRequest.deploymentId, deploymentRequest.deviceId)}`)
            .set(super.buildHeaders(additionalHeaders))
            .send(deploymentRequest);

        return res.body;
    }

    public async deleteDeployment(deploymentId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deploymentId, ow.string.nonEmpty);
        ow(deviceId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentByDeviceRelativeUrl(deploymentId, deviceId)}`;
        await request.delete(url).set(super.buildHeaders(additionalHeaders));

    }
}
