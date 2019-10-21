/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, queryParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import { BulkGroupsResource, BulkGroupsResult } from './groups.models';
import { GroupsService } from './groups.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';
import { GroupsAssembler } from './groups.assembler';

@controller('/bulkgroups')
export class BulkGroupsController implements interfaces.Controller {

    constructor( @inject(TYPES.GroupsService) private groupsService: GroupsService,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler) {}

    @httpPost('')
    public async bulkCreateGroups(@requestBody() groups: BulkGroupsResource, @response() res: Response, @queryParam('applyProfile') applyProfile?:string) : Promise<BulkGroupsResult> {
        logger.info(`bulkgroups.controller  bulkCreateGroups: in: groups:${JSON.stringify(groups)}, applyProfile:${applyProfile}`);
        try {
            const items = this.groupsAssembler.fromBulkGroupsResource(groups);
            const result = await this.groupsService.createBulk(items, applyProfile);
            res.status(201);
            return result;
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }
}
