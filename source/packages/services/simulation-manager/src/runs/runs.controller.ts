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
import { interfaces, controller, response, requestBody, httpPost, requestParam } from 'inversify-express-utils';

import {handleError} from '../utils/errors';
import {logger} from '../utils/logger';
import { RunItem } from './runs.models';
import { RunsService } from './runs.service';
import { TYPES } from '../di/types';

@controller('/simulations/:simulationId/runs')
export class RunsController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.RunsService) private _service: RunsService) {}

    @httpPost('/')
    public async createRun(@requestParam('simulationId') simulationId:string, @requestBody() item: RunItem, @response() res: Response): Promise<void> {

        logger.info(`Runs.controller createRun: simulationId:${simulationId}, item:${JSON.stringify(item)}`);

        try {
            item.simulationId=simulationId;
            const runId = await this._service.createRun({item});
            res.status(201).location(`/simulations/${simulationId}/runs/${runId}`);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Runs.controller createRun: exit:`);
    }

}
