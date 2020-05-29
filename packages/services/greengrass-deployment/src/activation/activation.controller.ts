/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { inject } from 'inversify';
import { interfaces, controller, response, requestBody, requestParam, httpPost, httpGet, httpDelete } from 'inversify-express-utils';

import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';

import { TYPES } from '../di/types';
import { ActivationService } from './activation.service';
import { ActivationRequest, ActivationModel } from './activation.model';

@controller('/devices')
export class ActivationController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.ActivationService) private _service: ActivationService) {}

    @httpPost('/:deviceId/activations')
    public async createActivation(
        @requestBody() req: ActivationRequest,
        @response() res: Response
    ) {

        logger.info(`Activation.controller createActivation: in: item:${JSON.stringify(req)}`);

        const activation = req;

        let result;
        try {
            result = await this._service.createActivation(activation);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Activation.controller createActivation: exit:`);

        return result;
    }

    @httpGet('/:deviceId/activations/:activationId')
    public async getActivation(
        @response() res: Response,
        @requestParam() params: any,
    ): Promise<any> {
        logger.debug(`Deployment.controller getDeployment: in: deviceId: ${params.deviceId}`);

        let activation: ActivationModel;

        try {
            activation = await this._service.getActivation(params.activationId, params.deviceId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit: ${JSON.stringify(activation)}`);

        return activation;
    }

    @httpDelete('/:deviceId/activations/:activationId')
    public async deleteActivation(
        @response() res: Response,
        @requestParam() params: any,
    ): Promise<void> {
        logger.debug(`Deployment.controller getDeployment: in: deviceId: ${params.deviceId}`);

        try {
            await this._service.deleteActivation(params.activationId, params.deviceId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit:`);
    }
}
