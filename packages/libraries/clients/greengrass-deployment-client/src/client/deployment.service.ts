/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
