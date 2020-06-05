/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {handleError} from '../utils/errors';
import { TYPES } from '../di/types';
import { GroupsAssembler } from './groups.assembler';
import { GroupResourceList, GroupResource } from './groups.models';
import { GroupsService } from './groups.service';

@controller('/groups')
export class GroupsController implements interfaces.Controller {

    constructor( @inject(TYPES.GroupsService) private groupsService: GroupsService,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler) {}

    @httpPost('')
    public async createGroups(@requestBody() groups:GroupResourceList, @response() res:Response) : Promise<GroupResourceList> {
        logger.info(`groups.controller createGroups: in: groups:${JSON.stringify(groups)}`);

        let result = new GroupResourceList();
        try {
            let items = this.groupsAssembler.fromResourceList(groups);
            items = await this.groupsService.createGroups(items);
            result = this.groupsAssembler.toResourceList(items);
        } catch (e) {
            handleError(e,res);
        }
        return result;
    }

    @httpGet('/:groupName')
    public async getGroupByName(@requestParam('groupName') name:string, @response() res:Response) : Promise<GroupResource> {
        logger.info(`groups.controller getGroupByName: in: name:${name}`);

        let group: GroupResource;
        try {
            const item = await this.groupsService.getGroup(name);
            group = await this.groupsAssembler.toResource(item);
            res.status(200);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`groups.controller getGroupByName: exit: ${JSON.stringify(group)}`);
        return group;
    }

}
