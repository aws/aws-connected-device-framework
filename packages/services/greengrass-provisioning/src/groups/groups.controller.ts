/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam, queryParam, httpDelete } from 'inversify-express-utils';
import { inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {handleError} from '../utils/errors';
import { TYPES } from '../di/types';
import { GroupsAssembler } from './groups.assembler';
import { GroupResourceList, GroupResource } from './groups.models';
import { GroupsService } from './groups.service';

@controller('')
export class GroupsController implements interfaces.Controller {

    constructor( @inject(TYPES.GroupsService) private groupsService: GroupsService,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler) {}

    @httpPost('/groups')
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

    @httpGet('/groups/:groupName')
    public async getGroupByName(@requestParam('groupName') name:string, @response() res:Response) : Promise<GroupResource> {
        logger.info(`groups.controller getGroupByName: in: name:${name}`);

        try {
            const item = await this.groupsService.getGroup(name);
            const group = await this.groupsAssembler.toResource(item);
            res.status(200);
            logger.debug(`groups.controller getGroupByName: exit: ${JSON.stringify(group)}`);
            return group;
        } catch (e) {
            logger.debug(`groups.controller getGroupByName: err: ${JSON.stringify(e)}`);
            handleError(e, res);
        }
        return undefined;
    }

    @httpDelete('/groups/:groupName')
    public async deleteGroupByName(@requestParam('groupName') name:string, @response() res:Response) : Promise<void> {
        logger.info(`groups.controller deleteGroupByName: in: name:${name}`);

        try {
            await this.groupsService.deleteGroup(name);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`groups.controller deleteGroupByName: exit:`);
    }

    @httpGet('/templates/:templateName/groups')
    public async listByTemplate(@requestParam('templateName') templateName:string, 
        @queryParam('token') token:string, @queryParam('limit') limit:number,
        @response() res:Response) : Promise<GroupResourceList> {
        logger.info(`groups.controller listByTemplate: in: templateName:${templateName}, token:${token}, limit:${limit}`);

        let r: GroupResourceList;
        try {
            const items = await this.groupsService.listByTemplate(templateName, undefined, {token, limit});
            r = this.groupsAssembler.toResourceList(items);
            res.status(200);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`groups.controller listByTemplate: exit: ${JSON.stringify(r)}`);
        return r;
    }

    @httpGet('/templates/:templateName/versions/:versionNo/groups')
    public async listByTemplateVersion(@requestParam('templateName') templateName:string, @requestParam('versionNo') versionNo:number, 
        @queryParam('token') token:string, @queryParam('limit') limit:number,
        @response() res:Response) : Promise<GroupResourceList> {
        logger.info(`groups.controller listByTemplateVersion: in: templateName:${templateName}, versionNo:${versionNo}, token:${token}, limit:${limit}`);

        let r: GroupResourceList;
        try {
            const items = await this.groupsService.listByTemplate(templateName, versionNo, {token, limit});
            r = this.groupsAssembler.toResourceList(items);
            res.status(200);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`groups.controller listByTemplateVersion: exit: ${JSON.stringify(r)}`);
        return r;
    }

}
