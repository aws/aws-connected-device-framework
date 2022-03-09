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
import { Authorizations } from './authz.full.model';
import { BaseDaoFull } from '../data/base.full.dao';

const __ = process.statics;     // eslint-disable-line no-underscore-dangle

@injectable()
export class AuthzDaoFull extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async listAuthorizedHierarchies(deviceIds:string[], groupPaths:string[], hierarchies:string[]) : Promise<Authorizations> {
        logger.debug(`authz.full.dao listAuthorizedHierarchies: in: deviceIds:${deviceIds}, groupPaths:${groupPaths}, hierarchies:${JSON.stringify(hierarchies)}`);

        if (deviceIds===undefined) {
            deviceIds=[];
        }
        if (groupPaths===undefined) {
            groupPaths=[];
        }
        const ids:string[] = deviceIds.map(d=> `device___${d}`);
        ids.push(...groupPaths.map(g=> `group___${g}`));

        let results;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V(ids).as('entity').union(
                    // return an item if the entity exists
                    __.project('entity','exists').
                        by(__.select('entity').coalesce(__.values('deviceId'),__.values('groupPath'))).
                        by(__.constant(true)) ,
                    // return an item if the entity is authorized
                    __.local(
                        __.until(
                            __.has('groupPath', process.P.within(hierarchies))
                        ).repeat(__.outE().has('isAuthCheck',true).otherV().simplePath().dedup()).as('authorizedPath')
                    ).project('entity','authorizedPath').
                        by(__.select('entity').coalesce(__.values('deviceId'),__.values('groupPath'))).
                        by(__.select('authorizedPath').values('groupPath'))
                );

            results = await traverser.toList();
        } finally {
            await conn.close();
        }

        logger.debug(`authz.full.dao listAuthorizedHierarchies: results:${JSON.stringify(results)}`);

        const response = new Authorizations();
        if (results!==undefined) {
            for(const r of results) {
                const entityId=r['entity'] as string;
                if (r['exists']) {
                    response.exists.push(entityId);
                } else {
                    const path=r['authorizedPath'] as string;
                    if (response.authorized[entityId]===undefined) {
                        response.authorized[entityId]=[];
                    }
                    response.authorized[entityId].push(path);
                }
            }
        }

        logger.debug(`authz.full.dao listAuthorizedHierarchies: exit:${JSON.stringify(response)}`);
        return response;

    }

}
