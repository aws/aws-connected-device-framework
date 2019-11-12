/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process, structure } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import { BaseDaoFull } from '../data/base.full.dao';

@injectable()
export class InitDaoFull extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async isInitialized(): Promise<boolean> {
        logger.debug('init.dao isInitialized: in: ');

        let query;
        const conn = super.getConnection();
        try {
            query = await conn.traversal.V('type___device').next();
        } finally {
            conn.close();
        }

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

        const conn = super.getConnection();
        try {
            await conn.traversal.addV('type').property(process.t.id, 'type___device').
                addV('type').property(process.t.id, 'type___group').
                addV('root').property(process.t.id, 'group___/').property('name','/').property('groupPath','/').
                iterate();
        } finally {
            conn.close();
        }
    }

    public async applyFixes(): Promise<void> {
        logger.debug('init.dao fixes: in:');

        const conn = super.getConnection();
        try {
            await conn.traversal.V('group___/').property('groupPath','/').
                iterate();
        } finally {
            conn.close();
        }
    }
}
