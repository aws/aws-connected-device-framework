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
import { Response } from 'express';
import {inject} from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    httpPatch,
    httpPost,
    interfaces,
    queryParam,
    requestBody,
    requestParam,
    response
} from 'inversify-express-utils';

import {handleError} from '../utils/errors';
import {logger} from '../utils/logger';

import {TYPES} from '../di/types';
import {DeploymentService} from './deployment.service';
import {DeploymentList, DeploymentModel, DeploymentRequest} from './deployment.model';


@controller('/devices')
export class DeploymentController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.DeploymentService) private deploymentService: DeploymentService) {
    }

    @httpPost('/:deviceId/deployments')
    public async createDeployment(
        @requestBody() req: DeploymentRequest,
        @response() res: Response
    ): Promise<void> {
        logger.debug(`Deployment.controller createRun(): deploymentRequest:${JSON.stringify(req)}`);

        let deploymentId;
        try {
            deploymentId = await this.deploymentService.create(req);
            res.status(201).location(`/deployments/${deploymentId}`);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller createRun: exit:`);
    }

    @httpGet('/:deviceId/deployments/:deploymentId')
    public async getDeployment(
        @response() res: Response,
        @requestParam('deviceId') deviceId: string,
        @requestParam('deploymentId') deploymentId: string,
    ): Promise<DeploymentModel> {
        logger.debug(`Deployment.controller getDeployment: in: deviceId: ${deviceId}`);

        let deploymentResource: DeploymentModel;

        try {
           deploymentResource = await this.deploymentService.get(deploymentId, deviceId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit: ${JSON.stringify(deploymentResource)}`);

        return deploymentResource;

    }

    @httpGet('/:deviceId/deployments')
    public async listDeployments(
        @response() res: Response,
        @requestParam('deviceId') deviceId: string,
        @queryParam('deploymentStatus') deploymentStatus: string,
    ): Promise<DeploymentList> {
        logger.debug(`Deployment.controller getDeployment: in: deviceId: ${deviceId}`);

        let deploymentResource: DeploymentList;

        try {
            deploymentResource = await this.deploymentService.listDeploymentsByDeviceId(deviceId, deploymentStatus);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit: ${JSON.stringify(deploymentResource)}`);

        return deploymentResource;
    }

    @httpDelete('/:deviceId/deployments/:deploymentId')
    public async deleteDeployment(
        @requestParam('deviceId') deviceId: string,
        @requestParam('deploymentId') deploymentId: string,
        @response() res: Response
    ): Promise<void> {

        logger.debug(`Deployment.controller deleteDeployment: in: deviceId: ${deviceId}`);

        try {
            await this.deploymentService.delete(deploymentId, deviceId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller delete: exit:}`);
    }

    @httpPatch('/:deviceId/deployments/:deploymentId')
    public async patchDeployment(
        @requestParam('deviceId') deviceId: string,
        @requestParam('deploymentId') deploymentId: string,
        @requestBody() req: DeploymentRequest,
        @response() res: Response
    ): Promise<void> {
        logger.debug(`Deployment.controller patchDeployment: in: deviceId: ${deviceId}, deploymentId: ${deploymentId}`);

        const deployment:DeploymentModel = {
            deviceId,
            deploymentId,
            ...req
        }

        try {
            await this.deploymentService.retry(deployment);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller patch: exit:}`);
    }

}
