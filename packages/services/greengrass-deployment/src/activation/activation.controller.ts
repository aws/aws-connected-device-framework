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
import { ActivationAssembler } from './activation.assember';
import { ActivationItem, ActivationResource } from './activation.model';

@controller('/devices')
export class ActivationController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.ActivationService) private activationService: ActivationService,
        @inject(TYPES.ActivationAssembler) private activationAssembler: ActivationAssembler
    ) {}

    @httpPost('/:deviceId/activations')
    public async createActivation(
        @requestBody() activation: ActivationResource,
        @response() res: Response
    ) : Promise<ActivationResource> {

        logger.info(`Activation.controller createActivation: in: item:${JSON.stringify(activation)}`);

        let resource: ActivationResource

        try {
            let item = this.activationAssembler.fromResource(activation);
            item = await this.activationService.createActivation(item);
            resource = this.activationAssembler.toResource(item)
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Activation.controller createActivation: exit:`);

        return resource;
    }

    @httpGet('/:deviceId/activations/:activationId')
    public async getActivation(
        @response() res: Response,
        @requestParam('deviceId') deviceId: string,
        @requestParam('activationId') activationId: string
    ): Promise<ActivationItem> {
        logger.debug(`Deployment.controller getDeployment: in: deviceId: ${deviceId}`);

        let activation: ActivationItem;

        try {
            activation = await this.activationService.getActivation(activationId, deviceId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit: ${JSON.stringify(activation)}`);

        return activation;
    }

    @httpDelete('/:deviceId/activations/:activationId')
    public async deleteActivation(
        @response() res: Response,
        @requestParam('deviceId') deviceId: string,
        @requestParam('activationId') activationId: string
    ): Promise<void> {
        logger.debug(`Deployment.controller getDeployment: in: deviceId: ${deviceId}`);

        try {
            await this.activationService.deleteActivation(activationId, deviceId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit:`);
    }
}
