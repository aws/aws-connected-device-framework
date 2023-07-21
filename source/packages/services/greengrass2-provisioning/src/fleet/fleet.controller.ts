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
import { controller, httpGet, interfaces, response } from 'inversify-express-utils';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import { handleError } from '../utils/errors.util';
import { TemplateUsage } from './fleet.model';
import { FleetService } from './fleet.service';

@controller('/fleet')
export class FleetController implements interfaces.Controller {
    constructor(@inject(TYPES.FleetService) private fleetService: FleetService) {}

    @httpGet('/summary')
    public async listTemplateUsage(@response() res: Response): Promise<TemplateUsage> {
        logger.debug(`fleet.controller listTemplateUsage: in:`);

        let r: TemplateUsage;
        try {
            r = await this.fleetService.listTemplateUsage();
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`fleet.controller listTemplateUsage: exit: ${JSON.stringify(r)}`);
        return r;
    }
}
