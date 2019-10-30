/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import {TypesService} from '../types/types.service';
import {TypeCategory} from '../types/constants';
import { InitDaoFull } from './init.full.dao';
import { TypeDefinitionModel } from '../types/types.models';
import { InitService } from './init.service';

@injectable()
export class InitServiceFull implements InitService {

    constructor( @inject(TYPES.InitDao) private initDao: InitDaoFull,
        @inject(TYPES.TypesService) private typesService: TypesService) {}

    public async init(): Promise<void> {
        logger.debug('init.service init: in:');

        await this.initDao.applyFixes();

        const initialized  = await this.initDao.isInitialized();
        if (initialized) {
            logger.debug(`init.service exit: already initialized!`);
            throw new Error ('ALREADY_INITIALIZED');
        }

        // create the root group type definition
        const definition:TypeDefinitionModel = new TypeDefinitionModel();
        definition.properties = {};
        await this.typesService.create('root', TypeCategory.Group, definition);
        await this.typesService.publish('root', TypeCategory.Group);

        // seed the database with the type categories
        await this.initDao.initialize();

    }

}
