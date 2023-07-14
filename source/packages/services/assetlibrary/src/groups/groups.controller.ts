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
import { logger } from '@awssolutions/simple-cdf-logger';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    httpPatch,
    httpPost,
    httpPut,
    interfaces,
    queryParam,
    request,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';
import { assembleSortKeys } from '../data/model';
import { DevicesAssembler } from '../devices/devices.assembler';
import { DeviceResourceList } from '../devices/devices.models';
import { TYPES } from '../di/types';
import { TypeCategory } from '../types/constants';
import { InvalidQueryStringError, handleError } from '../utils/errors';
import { GroupsAssembler } from './groups.assembler';
import { GroupBaseResource, GroupMemberResourceList, GroupResourceList } from './groups.models';
import { GroupsService } from './groups.service';

@controller('/groups')
export class GroupsController implements interfaces.Controller {
    constructor(
        @inject(TYPES.GroupsService) private groupsService: GroupsService,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
    ) {}

    @httpGet('/:groupPath')
    public async getGroup(
        @requestParam('groupPath') groupPath: string,
        @queryParam('includeGroups') groups: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<GroupBaseResource> {
        logger.info(`groups.controller get: in: groupPath: ${groupPath}`);
        try {
            const includeGroups = groups !== 'false';
            const model = await this.groupsService.get(groupPath, includeGroups);
            const resource = this.groupsAssembler.toGroupResource(model, req['version']);
            logger.debug(`controller exit: ${JSON.stringify(resource)}`);

            if (resource === undefined) {
                res.status(404);
            } else {
                return resource;
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpPost('')
    public async createGroup(
        @requestBody() group: GroupBaseResource,
        @response() res: Response,
        @queryParam('applyProfile') applyProfile?: string,
    ): Promise<void> {
        logger.info(
            `groups.controller createGroup: in: group: ${JSON.stringify(
                group,
            )}, applyProfile:${applyProfile}`,
        );
        try {
            const item = this.groupsAssembler.fromGroupResource(group);
            const groupPath = await this.groupsService.create(item, applyProfile);
            res.location(`/groups/${encodeURIComponent(groupPath)}`);
            res.setHeader('x-groupPath', groupPath);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpPatch('/:groupPath')
    public async updateGroup(
        @requestBody() group: GroupBaseResource,
        @response() res: Response,
        @requestParam('groupPath') groupPath: string,
        @queryParam('applyProfile') applyProfile?: string,
    ): Promise<void> {
        logger.info(
            `groups.controller update: in: groupPath: ${groupPath}, group: ${JSON.stringify(
                group,
            )}, applyProfile:${applyProfile}`,
        );
        try {
            group.groupPath = groupPath;
            const item = this.groupsAssembler.fromGroupResource(group);
            await this.groupsService.update(item, applyProfile);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:groupPath/members/:category')
    public async listGroupMembers(
        @requestParam('groupPath') groupPath: string,
        @requestParam('category') category: string,
        @queryParam('template') template: string,
        @queryParam('state') state: string,
        @queryParam('offset') offset: number,
        @queryParam('count') count: number,
        @queryParam('sort') sort: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<GroupMemberResourceList> {
        logger.info(
            `groups.controller listGroupMembers: in: groupPath:${groupPath}, category:${category}, template:${template}, state:${state}, offset:${offset}, count:${count}, sort:${sort}`,
        );

        let r: GroupMemberResourceList = { results: [] };

        const categoryTemplate =
            category.toLowerCase() === 'groups' ? TypeCategory.Group : TypeCategory.Device;
        try {
            if (Array.isArray(template)) {
                throw new InvalidQueryStringError(
                    'Only one `template` query param can be provided.',
                );
            }
            if (Array.isArray(state)) {
                throw new InvalidQueryStringError('Only one `state` query param can be provided.');
            }

            const sortKeys = assembleSortKeys(sort);
            const items = await this.groupsService.getMembers(
                groupPath,
                categoryTemplate,
                template,
                state,
                offset,
                count,
                sortKeys,
            );
            if (items === undefined) {
                res.status(404);
            }

            r = this.groupsAssembler.toGroupMemberResourceList(items, req['version']);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`controller exit: ${JSON.stringify(r)}`);
        return r;
    }

    @httpGet('/:groupPath/memberships')
    public async listGroupMemberships(
        @requestParam('groupPath') groupPath: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<GroupResourceList> {
        logger.info(`groups.controller getGroupMemberships: in: groupPath:${groupPath}`);
        try {
            const items = await this.groupsService.getParentGroups(groupPath);
            const resources = this.groupsAssembler.toGroupResourceList(
                { results: items },
                req['version'],
            );

            logger.debug(`controller exit: ${JSON.stringify(resources)}`);

            if (resources === undefined) {
                res.status(404);
            } else {
                return resources;
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpDelete('/:groupPath')
    public async deleteGroup(
        @response() res: Response,
        @requestParam('groupPath') groupPath: string,
    ): Promise<void> {
        logger.info(`groups.controller delete: in: groupPath: ${groupPath}`);
        try {
            await this.groupsService.delete(groupPath);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpPut('/:sourceGroupPath/:relationship/groups/:targetGroupPath')
    public async attachToGroup(
        @requestParam('sourceGroupPath') sourceGroupPath: string,
        @requestParam('relationship') relationship: string,
        @requestParam('targetGroupPath') targetGroupPath: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `groups.controller attachToGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`,
        );
        try {
            await this.groupsService.attachToGroup(sourceGroupPath, relationship, targetGroupPath);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/:sourceGroupPath/:relationship/groups/:targetGroupPath')
    public async detachFromGroup(
        @requestParam('sourceGroupPath') sourceGroupPath: string,
        @requestParam('relationship') relationship: string,
        @requestParam('targetGroupPath') targetGroupPath: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `groups.controller detachFromGroup: in: sourceGroupPath:${sourceGroupPath}, relationship:${relationship}, targetGroupPath:${targetGroupPath}`,
        );
        try {
            await this.groupsService.detachFromGroup(
                sourceGroupPath,
                relationship,
                targetGroupPath,
            );
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:groupPath/:relationship/groups')
    public async listGroupRelatedGroups(
        @requestParam('groupPath') groupPath: string,
        @requestParam('relationship') relationship: string,
        @queryParam('template') template: string,
        @queryParam('direction') direction: string,
        @queryParam('offset') offset: number,
        @queryParam('count') count: number,
        @queryParam('sort') sort: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<GroupResourceList> {
        logger.info(
            `groups.controller listGroupRelatedGroups: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}, sort:${sort}`,
        );

        let r: GroupResourceList = { results: [] };

        try {
            if (Array.isArray(direction)) {
                throw new InvalidQueryStringError(
                    'Only one `direction` query param can be provided.',
                );
            }
            if (Array.isArray(template)) {
                throw new InvalidQueryStringError(
                    'Only one `template` query param can be provided.',
                );
            }

            const sortKeys = assembleSortKeys(sort);
            const items = await this.groupsService.listRelatedGroups(
                groupPath,
                relationship,
                direction,
                template,
                offset,
                count,
                sortKeys,
            );
            r = this.groupsAssembler.toGroupResourceList(items, req['version']);

            if (r === undefined) {
                res.status(404);
            }
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`groups.controller listGroupRelatedGroups: exit: ${JSON.stringify(r)}`);
        return r;
    }

    @httpGet('/:groupPath/:relationship/devices')
    public async listGroupRelatedDevices(
        @requestParam('groupPath') groupPath: string,
        @requestParam('relationship') relationship: string,
        @queryParam('template') template: string,
        @queryParam('direction') direction: string,
        @queryParam('state') state: string,
        @queryParam('offset') offset: number,
        @queryParam('count') count: number,
        @queryParam('sort') sort: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<DeviceResourceList> {
        logger.info(
            `groups.controller listGroupRelatedDevices: in: groupPath:${groupPath}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}, sort:${sort}`,
        );

        let r: DeviceResourceList = { results: [] };

        try {
            if (Array.isArray(direction)) {
                throw new InvalidQueryStringError(
                    'Only one `direction` query param can be provided.',
                );
            }
            if (Array.isArray(template)) {
                throw new InvalidQueryStringError(
                    'Only one `template` query param can be provided.',
                );
            }
            if (Array.isArray(state)) {
                throw new InvalidQueryStringError('Only one `state` query param can be provided.');
            }

            const sortKeys = assembleSortKeys(sort);
            const items = await this.groupsService.listRelatedDevices(
                groupPath,
                relationship,
                direction,
                template,
                state,
                offset,
                count,
                sortKeys,
            );
            r = this.devicesAssembler.toDeviceResourceList(items, req['version']);
            if (r === undefined) {
                res.status(404);
            }
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`groups.controller listGroupRelatedDevices: exit: ${JSON.stringify(r)}`);
        return r;
    }
}
