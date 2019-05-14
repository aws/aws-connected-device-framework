
/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
