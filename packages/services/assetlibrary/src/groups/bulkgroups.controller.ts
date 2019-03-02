/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, queryParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import { BulkLoadGroupsRequest, BulkLoadGroupsResult } from './groups.models';
import { GroupsService } from './groups.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';

@controller('/bulkgroups')
export class BulkGroupsController implements interfaces.Controller {

    constructor( @inject(TYPES.GroupsService) private groupsService: GroupsService) {}

    @httpPost('')
    public async bulkCreateGroups(@requestBody() groups: BulkLoadGroupsRequest, @response() res: Response, @queryParam('applyProfile') applyProfile?:string) : Promise<BulkLoadGroupsResult> {
        logger.info(`bulkgroups.controller  bulkCreateGroups: in: groups:${JSON.stringify(groups)}, applyProfile:${applyProfile}`);
        try {
            const result = await this.groupsService.createBulk(groups, applyProfile);
            res.status(201);
            return result;
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }
}
