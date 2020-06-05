/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { inject } from 'inversify';
import { interfaces, controller, response, requestBody, requestParam, queryParam, httpPost, httpGet, httpPut, httpDelete } from 'inversify-express-utils';

import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';

import { TYPES } from '../di/types';
import { DeploymentService } from './deployment.service';
import { DeploymentRequest, DeploymentModel } from './deployment.model';

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
        } catch (err) {
            handleError(err, res);
        }

        res.status(201).location(`/deployments/${deploymentId}`);

        logger.debug(`Deployment.controller createRun: exit:`);
    }

    @httpGet('/:deviceId/deployments/:deploymentId')
    public async getDeployment(
        @response() res: Response,
        @requestParam() params: any,
    ): Promise<any> {
        logger.debug(`Deployment.controller getDeployment: in: deviceId: ${params.deviceId}`);

        let deploymentResource: DeploymentModel;

        try {
           deploymentResource = await this.deploymentService.get(params.deploymentId, params.deviceId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit: ${JSON.stringify(deploymentResource)}`);

        return deploymentResource;

    }

    @httpGet('/:deviceId/deployments')
    public async listDeployments(
        @response() res: Response,
        @requestParam() params: any,
        @queryParam() queryParmas: any,
    ): Promise<any> {
        logger.debug(`Deployment.controller getDeployment: in: deviceId: ${params.deviceId}`);

        let deploymentResource: DeploymentModel;

        try {
            deploymentResource = await this.deploymentService.listDeploymentsByDeviceId(params.deviceId, queryParmas.deploymentStatus);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit: ${JSON.stringify(deploymentResource)}`);

        return deploymentResource;
    }

    @httpPut('/:deviceId/deployments/:deploymentId')
    public async updateDeployments(
        @requestBody() req: DeploymentRequest,
        @requestParam() params: any,
        @response() res: Response
    ): Promise<void> {

        const deploymentResource: DeploymentModel = {
            deploymentId: params.deploymentId,
            deviceId: params.deviceId,
            deploymentStatus: req.deploymentStatus
        };

        try {
            await this.deploymentService.update(deploymentResource);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit: ${JSON.stringify(deploymentResource)}`);
    }

    @httpDelete('/:deviceId/deployments/:deploymentId')
    public async deleteDeployment(
        @requestParam() params: any,
        @response() res: Response
    ): Promise<void> {

        logger.debug(`Deployment.controller deleteDeployment: in: deviceId: ${params.deviceId}`);

        try {
            await this.deploymentService.delete(params.deploymentId, params.deviceId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller delete: exit:}`);
    }

}
