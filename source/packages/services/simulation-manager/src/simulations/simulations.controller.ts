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
import { interfaces, controller, response, requestBody, httpPost } from 'inversify-express-utils';

import {handleError} from '../utils/errors';
import {logger} from '../utils/logger';
import { SimulationItem } from './simulations.model';
import { SimulationsService } from './simulations.service';
import { TYPES } from '../di/types';

@controller('/simulations')
export class SimulationsController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.SimulationsService) private _servcie: SimulationsService) {}

    @httpPost('/')
    public async createSimulation(@requestBody() item: SimulationItem, @response() res: Response): Promise<void> {

        logger.info(`simulations.controller createSimulation: item:${JSON.stringify(item)}`);

        try {
           const simulationId = await this._servcie.createSimulation({item});
            res.status(201).location(`/simulations/${simulationId}`);
            // TODO: add id to location header
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`simulations.controller createSimulation: exit:`);
    }

}
