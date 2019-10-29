/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';

const __ = process.statics;

@injectable()
export class AuthzDaoFull {

    private _g: process.GraphTraversalSource;

    public constructor(
	    @inject(TYPES.GraphTraversalSourceFactory) graphTraversalSourceFactory: () => process.GraphTraversalSource
    ) {
        this._g = graphTraversalSourceFactory();
    }

    public async listAuthorizedHierarchies(deviceIds:string[], groupPaths:string[], hierarchies:string[]) : Promise<{[entityd:string]:string[]}> {
        logger.debug(`authz.full.dao listAuthorizedHierarchies: in: deviceIds:${deviceIds}, groupPaths:${groupPaths}, hierarchies:${JSON.stringify(hierarchies)}`);

        if (deviceIds===undefined) {
            deviceIds=[];
        }
        if (groupPaths===undefined) {
            groupPaths=[];
        }
        const ids:string[] = deviceIds.map(d=> `device___${d}`);
        ids.push(...groupPaths.map(g=> `group___${g}`));

        const traverser = this._g.V(ids).as('entity').
            local(__.until(
                    __.has('groupPath', process.P.within(hierarchies))
                ).repeat(__.out()).as('authorizedPath')
            ).dedup().project('entity','authorizedPath').
                by(__.select('entity').coalesce(__.values('deviceId'),__.values('groupPath'))).
                by(__.select('authorizedPath').values('groupPath'));

        const results = await traverser.toList();

        logger.debug(`authz.full.dao listAuthorizedHierarchies: results:${JSON.stringify(results)}`);

        if (results===undefined || results.length===0) {
            logger.debug(`authz.full.dao listAuthorizedHierarchies: exit: undefined`);
            return undefined;
        }

        const response:{[entityId:string]:string[]} = {};
        for(const r of results) {
            const entity=r['entity'] as string;
            const path=r['authorizedPath'] as string;

            if (response[entity]===undefined) {
                response[entity]=[];
            }
            response[entity].push(path);
        }

        logger.debug(`authz.full.dao listAuthorizedHierarchies: exit:${JSON.stringify(response)}`);
        return response;

    }

}
