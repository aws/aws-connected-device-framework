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
import { inject } from 'inversify';
import { interfaces, controller, response, requestBody, requestParam, httpPost, httpGet, httpDelete } from 'inversify-express-utils';

import { handleError } from '../utils/errors';
import { logger } from '@awssolutions/simple-cdf-logger';

import { TYPES } from '../di/types';
import { ActivationService } from './activation.service';
import { ActivationAssembler } from './activation.assember';
import { ActivationResource } from './activation.model';

@controller('')
export class ActivationController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.ActivationService) private activationService: ActivationService,
        @inject(TYPES.ActivationAssembler) private activationAssembler: ActivationAssembler
    ) {}

    @httpPost('/activations')
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

    @httpGet('/activations/:activationId')
    public async getActivation(
        @response() res: Response,
        @requestParam('activationId') activationId: string
    ): Promise<ActivationResource> {
        logger.debug(`activation.controller getActivation: in: activationId:${activationId}`);

        let activation: ActivationResource;

        try {
            activation = await this.activationService.getActivation(activationId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`activation.controller getActivation: exit: ${JSON.stringify(activation)}`);

        return activation;
    }


    @httpDelete('/activations/:activationId')
    public async deleteActivation(
        @response() res: Response,
        @requestParam('activationId') activationId: string
    ): Promise<void> {
        logger.debug(`activation.controller: in: activationId: ${activationId}`);

        try {
            await this.activationService.deleteActivation(activationId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`activation.controller getActivation: exit:`);
    }
}
