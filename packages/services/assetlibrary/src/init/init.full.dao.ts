/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';

@injectable()
export class InitDaoFull {

    private _g: process.GraphTraversalSource;

    public constructor(
	    @inject(TYPES.GraphTraversalSourceFactory) graphTraversalSourceFactory: () => process.GraphTraversalSource
    ) {
        this._g = graphTraversalSourceFactory();
    }

    public async isInitialized(): Promise<boolean> {
        logger.debug('init.dao isInitialized: in: ');

        const query = await this._g.V('type___device').next();

        logger.debug(`init.dao isInitialized: query: ${JSON.stringify(query)}`);

        let initialized:boolean=true;

        if (query===undefined || query.value===null) {
            initialized=false;
        }

        logger.debug(`init.dao isInitialized: exit: initialized: ${initialized}`);
        return initialized;
    }

    public async initialize(): Promise<void> {
        logger.debug('init.dao initialize: in:');

        await this._g.addV('type').property(process.t.id, 'type___device').
            addV('type').property(process.t.id, 'type___group').
            addV('root').property(process.t.id, 'group___/').property('name','/').
            iterate();
    }

}
