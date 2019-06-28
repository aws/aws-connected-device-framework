/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, httpGet, response, requestParam, httpPost, requestBody, queryParam , httpDelete, httpPatch, httpPut} from 'inversify-express-utils';
import { inject } from 'inversify';
import { GroupModel, GroupListModel, GroupsMembersModel, RelatedGroupListModel } from './groups.models';
import { GroupsService } from './groups.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {TypeCategory} from '../types/constants';
import {handleError} from '../utils/errors';
import { RelatedDeviceListResult } from '../devices/devices.models';

@controller('/groups')
export class GroupsController implements interfaces.Controller {

    constructor( @inject(TYPES.GroupsService) private groupsService: GroupsService) {}

    @httpGet('/:groupPath')
    public async getGroup(@requestParam('groupPath') groupPath: string,
        @response() res: Response): Promise<GroupModel> {

        logger.info(`groups.controller get: in: groupPath: ${groupPath}`);
        try {
            const model = await this.groupsService.get(groupPath);
            logger.debug(`controller exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPost('')
    public async createGroup(@requestBody() group: GroupModel, @response() res: Response, @queryParam('applyProfile') applyProfile?:string) {
        logger.info(`groups.controller  createGroup: in: group: ${JSON.stringify(group)}, applyProfile:${applyProfile}`);
        try {
            await this.groupsService.create(group, applyProfile);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPatch('/:groupPath')
    public async updateGroup(@requestBody() group: GroupModel, @response() res: Response, @requestParam('groupPath') groupPath: string, @queryParam('applyProfile') applyProfile?:string) {

        logger.info(`groups.controller update: in: groupPath: ${groupPath}, group: ${JSON.stringify(group)}, applyProfile:${applyProfile}`);
        try {
            group.groupPath = groupPath;
            await this.groupsService.update(group, applyProfile);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('/:groupPath/members/:category')
    public async listGroupMembers(@requestParam('groupPath') groupPath:string, @requestParam('category') category:string,
        @queryParam('template') template:string, @queryParam('state') state:string,
        @queryParam('offset') offset:number, @queryParam('count') count:number, @response() res:Response): Promise<GroupsMembersModel> {

        logger.info(`groups.controller listGroupMembers: in: groupPath:${groupPath}, category:${category}, template:${template}, state:${state}, offset:${offset}, count:${count}`);

        let r: GroupsMembersModel= {results:[]};

        const categoryTemplate = (category.toLowerCase()==='groups') ? TypeCategory.Group : TypeCategory.Device;
        try {
            r = await this.groupsService.getMembers(groupPath, categoryTemplate, template, state, offset, count);
            if (r===undefined) {
                res.status(404);
            }
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`controller exit: ${JSON.stringify(r)}`);
        return r;
    }

    @httpGet('/:groupPath/memberships')
    public async listGroupMemberships(@requestParam('groupPath') groupPath:string, @response() res:Response): Promise<GroupListModel> {

        logger.info(`groups.controller getGroupMemberships: in: groupPath:${groupPath}`);
        try {
            const model = await this.groupsService.getParentGroups(groupPath);
            logger.debug(`controller exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404);
            } else {
                return  {results: model};
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpDelete('/:groupPath')
    public async deleteGroup(@response() res: Response, @requestParam('groupPath') groupPath: string) {

        logger.info(`groups.controller delete: in: groupPath: ${groupPath}`);
        try {
            await this.groupsService.delete(groupPath);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPut('/:sourceGroupPath/:relationship/groups/:targetGroupPath')
    public async attachToGroup(@requestParam('sourceGroupPath') sourceGroupPath: string, @requestParam('relationship') relationship: string,
        @requestParam('targetGroupPath') targetGroupPath: string, @response() res: Response) {

        logger.info(`groups.controller attachToGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);
        try {
            await this.groupsService.attachToGroup(sourceGroupPath, relationship, targetGroupPath);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:sourceGroupPath/:relationship/groups/:targetGroupPath')
    public async detachFromGroup(@requestParam('sourceGroupPath') sourceGroupPath: string, @requestParam('relationship') relationship: string,
        @requestParam('targetGroupPath') targetGroupPath: string, @response() res: Response) {

        logger.info(`groups.controller detachFromGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`);
        try {
            await this.groupsService.detachFromGroup(sourceGroupPath, relationship, targetGroupPath);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('/:groupPath/:relationship/groups')
    public async listGroupRelatedGroups(@requestParam('groupPath') groupPath: string, @requestParam('relationship') relationship: string,
        @queryParam('template') template:string, @queryParam('direction') direction:string,
        @queryParam('offset') offset:number, @queryParam('count') count:number,
        @response() res: Response) : Promise<RelatedGroupListModel> {

            logger.info(`groups.controller listGroupRelatedGroups: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}`);

            let r: RelatedGroupListModel = {results:[]};

            try {
                r = await this.groupsService.listRelatedGroups(groupPath, relationship, direction, template, offset, count);
                if (r===undefined) {
                    res.status(404);
                }
            } catch (e) {
                handleError(e,res);
            }
            logger.debug(`groups.controller listGroupRelatedGroups: exit: ${JSON.stringify(r)}`);
            return r;
    }

    @httpGet('/:groupPath/:relationship/devices')
    public async listGroupRelatedDevices(@requestParam('groupPath') groupPath: string, @requestParam('relationship') relationship: string,
        @queryParam('template') template:string, @queryParam('direction') direction:string, @queryParam('state') state:string,
        @queryParam('offset') offset:number, @queryParam('count') count:number,
        @response() res: Response) : Promise<RelatedDeviceListResult> {

            logger.info(`groups.controller listGroupRelatedDevices: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}`);

            let r: RelatedDeviceListResult = {results:[]};

            try {
                r = await this.groupsService.listRelatedDevices(groupPath, relationship, direction, template, state, offset, count);
                if (r===undefined) {
                    res.status(404);
                }
            } catch (e) {
                handleError(e,res);
            }
            logger.debug(`groups.controller listGroupRelatedDevices: exit: ${JSON.stringify(r)}`);
            return r;
    }

}
