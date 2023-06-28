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
import { Response, Request } from 'express';
import { interfaces, controller, response, request, requestBody, httpPost, httpGet,queryParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import { BulkGroupsResource, BulkGroupsResult, GroupMemberResourceList } from './groups.models';
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

    @httpGet('')
    public async bulkGetGroups(
            @queryParam('groupPaths') groupPaths: string,
            @queryParam('includeGroups') groups: string,
            @request() req: Request,
            @response() res: Response
        ) : Promise<GroupMemberResourceList> {
            logger.info(`bulkgroups.controller bulkGetGroups: in: groupPaths:${groupPaths}`);
            try {
                const includeGroups = (groups!=='false');
                let groupPathsAsArray = (groupPaths ?? '').split(',');
                // remove duplicate group paths if any
                groupPathsAsArray = groupPathsAsArray.filter((item, index) => groupPathsAsArray.indexOf(item) === index);

                const items = await this.groupsService.getBulk(groupPathsAsArray, includeGroups);
                const resources = this.groupsAssembler.toGroupMemberResourceList(items, req['version']);
                res.status(200);
                return resources;
            } catch (e) {
                handleError(e, res);
            }
            return null;
        }
}
