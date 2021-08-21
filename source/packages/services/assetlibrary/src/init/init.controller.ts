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
import { interfaces, controller, response, httpPost } from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';
import { InitService } from './init.service';

@controller('/48e876fe-8830-4996-baa0-9c0dd92bd6a2/init')
export class InitController implements interfaces.Controller {

    constructor( @inject(TYPES.InitService) private initService: InitService,) {}

    @httpPost('')
    public async dbInit (@response() res: Response): Promise<void> {
        logger.info('init.controller  dbInit: in:');
        try {
            await this.initService.init();
        } catch (e) {
            handleError(e,res);
        }
    }

}
