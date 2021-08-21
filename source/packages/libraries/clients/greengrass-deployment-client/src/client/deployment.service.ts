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
    DeploymentRequest,
    DeploymentResponse,
    DeploymentResponseList
} from './deployment.model'

export interface DeploymentService {

    createDeployment(deploymentRequest: DeploymentRequest, additionalHeaders?:RequestHeaders): Promise<DeploymentResponse>;

    getDeployment(deploymentId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentResponse>;

    listDeploymentsByDeviceId(deviceId: string, status?: string, additionalHeaders?:RequestHeaders): Promise<DeploymentResponseList>;

    updateDeployment(deployment: DeploymentRequest, additionalHeaders?:RequestHeaders): Promise<void>;

    deleteDeployment(deploymentId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<void>;

}

@injectable()
export class DeploymentServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected deploymentRelativeUrl(deviceId: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, 'deployments');
    }

    protected deploymentByDeviceRelativeUrl(deploymentId: string, deviceId: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, 'deployments', deploymentId);
    }

}
