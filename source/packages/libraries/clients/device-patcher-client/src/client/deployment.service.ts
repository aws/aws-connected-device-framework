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

import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import { RequestHeaders } from './common.model';

import {
    DeploymentResponse,
    ListDeploymentsResponse, DeploymentTaskRequest, DeploymentTaskResponse, UpdateDeploymentRequest
} from './deployment.model'

export interface DeploymentService {

    createDeploymentTask(deploymentRequest: DeploymentTaskRequest, additionalHeaders?:RequestHeaders): Promise<string>;

    getDeploymentTask(taskId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentTaskResponse>;

    getDeployment(deploymentId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentResponse>;

    listDeploymentsByTaskId(taskId:string, additionalHeaders?:RequestHeaders): Promise<ListDeploymentsResponse>;

    listDeploymentsByDeviceId(deviceId: string, status?: string, additionalHeaders?:RequestHeaders): Promise<ListDeploymentsResponse>;

    updateDeployment(deployment: UpdateDeploymentRequest, additionalHeaders?:RequestHeaders): Promise<void>;

    deleteDeployment(deploymentId: string, additionalHeaders?:RequestHeaders): Promise<void>;

}

@injectable()
export class DeploymentServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected deploymentTasksRelativeUrl(): string {
        return PathHelper.encodeUrl('deploymentTasks');
    }

    protected deploymentTaskRelativeUrl(taskId: string): string {
        return PathHelper.encodeUrl('deploymentTasks', taskId);
    }

    protected deploymentByTaskRelativeUrl(taskId: string): string {
        return PathHelper.encodeUrl('deploymentTasks', taskId, 'deployments');
    }

    protected deploymentsRelativeUrl(deploymentId: string) : string {
        return PathHelper.encodeUrl( 'deployments', deploymentId);
    }

    protected deploymentByDeviceRelativeUrl(deviceId: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, 'deployments');
    }

}
