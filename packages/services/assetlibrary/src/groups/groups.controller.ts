/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Request, Response } from 'express';
import { interfaces, controller, httpGet, response, request, requestParam, httpPost, requestBody, queryParam , httpDelete, httpPatch, httpPut} from 'inversify-express-utils';
import { inject } from 'inversify';
import { GroupBaseResource, GroupResourceList, GroupMemberResourceList } from './groups.models';
import { GroupsService } from './groups.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {TypeCategory} from '../types/constants';
import {handleError} from '../utils/errors';
import { DeviceResourceList } from '../devices/devices.models';
import { GroupsAssembler } from './groups.assembler';
import { DevicesAssembler } from '../devices/devices.assembler';

@controller('/groups')
export class GroupsController implements interfaces.Controller {

    constructor( @inject(TYPES.GroupsService) private groupsService: GroupsService,
    @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
    @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler) {}

    @httpGet('/:groupPath')
    public async getGroup(@requestParam('groupPath') groupPath: string,
        @request() req: Request, @response() res: Response): Promise<GroupBaseResource> {

        logger.info(`groups.controller get: in: groupPath: ${groupPath}`);
        try {
            const model = await this.groupsService.get(groupPath);
            const resource = this.groupsAssembler.toGroupResource(model, req['version']);
            logger.debug(`controller exit: ${JSON.stringify(resource)}`);

            if (resource===undefined) {
                res.status(404);
            } else {
                return resource;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPost('')
    public async createGroup(@requestBody() group: GroupBaseResource, @response() res: Response, @queryParam('applyProfile') applyProfile?:string) {
        logger.info(`groups.controller createGroup: in: group: ${JSON.stringify(group)}, applyProfile:${applyProfile}`);
        try {
            const item = this.groupsAssembler.fromGroupResource(group);
            await this.groupsService.create(item, applyProfile);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpPatch('/:groupPath')
    public async updateGroup(@requestBody() group: GroupBaseResource, @response() res: Response, @requestParam('groupPath') groupPath: string, @queryParam('applyProfile') applyProfile?:string) {

        logger.info(`groups.controller update: in: groupPath: ${groupPath}, group: ${JSON.stringify(group)}, applyProfile:${applyProfile}`);
        try {
            group.groupPath = groupPath;
            const item = this.groupsAssembler.fromGroupResource(group);
            await this.groupsService.update(item, applyProfile);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('/:groupPath/members/:category')
    public async listGroupMembers(@requestParam('groupPath') groupPath:string, @requestParam('category') category:string,
        @queryParam('template') template:string, @queryParam('state') state:string, @queryParam('offset') offset:number,
        @queryParam('count') count:number, @request() req:Request, @response() res:Response): Promise<GroupMemberResourceList> {

        logger.info(`groups.controller listGroupMembers: in: groupPath:${groupPath}, category:${category}, template:${template}, state:${state}, offset:${offset}, count:${count}`);

        let r: GroupMemberResourceList = {results:[]};

        const categoryTemplate = (category.toLowerCase()==='groups') ? TypeCategory.Group : TypeCategory.Device;
        try {
            const items = await this.groupsService.getMembers(groupPath, categoryTemplate, template, state, offset, count);
            if (items===undefined) {
                res.status(404);
            }

            r = this.groupsAssembler.toGroupMemberResourceList(items, req['version']);

        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`controller exit: ${JSON.stringify(r)}`);
        return r;
    }

    @httpGet('/:groupPath/memberships')
    public async listGroupMemberships(@requestParam('groupPath') groupPath:string,
        @request() req:Request, @response() res:Response): Promise<GroupResourceList> {

        logger.info(`groups.controller getGroupMemberships: in: groupPath:${groupPath}`);
        try {
            const items = await this.groupsService.getParentGroups(groupPath);
            const resources = this.groupsAssembler.toGroupResourceList({results:items}, req['version']);

            logger.debug(`controller exit: ${JSON.stringify(resources)}`);

            if (resources===undefined) {
                res.status(404);
            } else {
                return resources;
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
        @request() req:Request, @response() res: Response) : Promise<GroupResourceList> {

            logger.info(`groups.controller listGroupRelatedGroups: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}`);

            let r: GroupResourceList = {results:[]};

            try {
                const items = await this.groupsService.listRelatedGroups(groupPath, relationship, direction, template, offset, count);
                r = this.groupsAssembler.toGroupResourceList(items, req['version']);

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
        @request() req:Request, @response() res: Response) : Promise<DeviceResourceList> {

            logger.info(`groups.controller listGroupRelatedDevices: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}`);

            let r: DeviceResourceList = {results:[]};

            try {
                const items = await this.groupsService.listRelatedDevices(groupPath, relationship, direction, template, state, offset, count);
                r = this.devicesAssembler.toDeviceResourceList(items, req['version']);
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
