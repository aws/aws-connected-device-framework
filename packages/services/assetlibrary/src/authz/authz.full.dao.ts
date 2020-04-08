/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process, structure } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import { Authorizations } from './authz.full.model';
import { BaseDaoFull } from '../data/base.full.dao';

const __ = process.statics;

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
                        ).repeat(__.out().simplePath().dedup()).as('authorizedPath')
                    ).project('entity','authorizedPath').
                        by(__.select('entity').coalesce(__.values('deviceId'),__.values('groupPath'))).
                        by(__.select('authorizedPath').values('groupPath'))
                );

            results = await traverser.toList();
        } finally {
            conn.close();
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
