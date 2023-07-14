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
import { controller, httpPost, interfaces, requestBody, response } from 'inversify-express-utils';

import { TYPES } from '../di/types';
import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';
import { CreateSimulationRequest } from './simulations.model';
import { SimulationsService } from './simulations.service';

@controller('/simulations')
export class SimulationsController implements interfaces.Controller {
    public constructor(
        @inject(TYPES.SimulationsService) private simulationService: SimulationsService,
    ) {}

    @httpPost('/')
    public async createSimulation(
        @requestBody() request: CreateSimulationRequest,
        @response() res: Response,
    ): Promise<void> {
        logger.info(`simulations.controller createSimulation: request:${JSON.stringify(request)}`);

        try {
            const simulationId = await this.simulationService.createSimulation(request);
            res.location(`/simulations/${simulationId}`)
                .header('x-simulationid', simulationId)
                .status(201)
                .send();
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`simulations.controller createSimulation: exit:`);
    }
}
