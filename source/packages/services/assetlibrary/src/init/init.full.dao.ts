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
import { process, structure } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import { BaseDaoFull } from '../data/base.full.dao';

@injectable()
export class InitDaoFull extends BaseDaoFull {

    public constructor(
        @inject('aws.neptune.url') neptuneUrl: string,
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
            await conn.close();
        }

        logger.debug(`init.dao isInitialized: query: ${JSON.stringify(query)}`);

        let initialized=true;

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
            await conn.close();
        }
    }

    public async applyFixes(): Promise<void> {
        logger.debug('init.dao fixes: in:');

        const conn = super.getConnection();
        try {
            await conn.traversal.V('group___/').property('groupPath','/').
                iterate();
        } finally {
            await conn.close();
        }
    }
}
