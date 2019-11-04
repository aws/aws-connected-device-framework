/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import { Claims, ClaimAccess } from '../authz/claims';
import { AuthzDaoFull } from './authz.full.dao';

@injectable()
export class AuthzServiceFull {

    constructor( @inject(TYPES.AuthzDaoFull) private dao: AuthzDaoFull,
        @inject('authorization.enabled') private isAuthzEnabled: boolean) {}

    public async authorizationCheck(deviceIds:string[], groupPaths:string[], accessLevelRequired:ClaimAccess):Promise<void> {
        logger.debug(`authz.full.service authorizationCheck: in: deviceIds:${deviceIds}, groupPaths:${groupPaths}, accessLevelRequired:${accessLevelRequired}`);

        if (!this.isAuthzEnabled) {
            logger.debug(`authz.full.service authorizationCheck: authz not enabled`);
            return;
        }

        if (deviceIds===undefined || deviceIds=== null) {
            deviceIds=[];
        }
        if (groupPaths===undefined || groupPaths=== null) {
            groupPaths=[];
        }
        const combinedIds:string[]= [];
        combinedIds.push(...deviceIds, ...groupPaths);

        if (combinedIds.length===0) {
            return;
        }

        logger.debug(`authz.full.service authorizationCheck: combinedIds:${JSON.stringify(combinedIds)}`);

        // retrieve the claims from the thread local
        const claims = Claims.getInstance();
        logger.debug(`authz.full.service authorizationCheck: claims: ${JSON.stringify(claims)}`);

        // determine if the user has any access to provided ids via their allowed hierarchies
        const authorizations = await this.dao.listAuthorizedHierarchies(deviceIds, groupPaths, claims.listPaths());

        // if one if the requested items is missing, we refuse the whole request
        if (authorizations.exists.length!==deviceIds.length+groupPaths.length) {
            throw new Error('NOT_FOUND');
        }

        // if the user does not have access to all, then not authorized to any
        const notAuthorized = Object.keys(authorizations.authorized).filter(k=> !combinedIds.includes(k));
        if (notAuthorized.length>0) {
            logger.debug(`authz.full.service authorizationCheck: not authorized to: ${notAuthorized}`);
            throw new Error('NOT_AUTHORIZED');
        }

        // even though the user has access to a hierarchy, need to ensure its the right level of access
        const entitiesWithSufficientAccess:string[]= [];
        for (const entityId of Object.keys(authorizations.authorized)) {
            const paths = authorizations.authorized[entityId];
            for (const path of paths) {
                if (claims.hasAccessForPath(path, accessLevelRequired)) {
                    entitiesWithSufficientAccess.push(entityId);
                    break;
                }
            }
        }

        logger.debug(`authz.full.service authorizationCheck: entitiesWithSufficientAccess:${JSON.stringify(entitiesWithSufficientAccess)}`);

        if (entitiesWithSufficientAccess.length!==combinedIds.length) {
            logger.debug(`authz.full.service authorizationCheck: not authorized`);
            throw new Error('NOT_AUTHORIZED');
        }

    }
}
