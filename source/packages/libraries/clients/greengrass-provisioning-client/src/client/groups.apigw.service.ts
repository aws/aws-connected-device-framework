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
import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { GroupsServiceBase, GroupsService } from './groups.service';
import { GroupList, Group } from './groups.model';

@injectable()
export class GroupsApigwService extends GroupsServiceBase implements GroupsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassProvisioning.baseUrl') as string;
    }

    async createGroups(groups:Group[], additionalHeaders?:RequestHeaders) : Promise<GroupList> {
        ow(groups, ow.object.nonEmpty);
        const url = `${this.baseUrl}${super.groupsRelativeUrl()}`;
        const res = await request.post(url)
            .send({groups})
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getGroupByName(groupName:string, additionalHeaders?:RequestHeaders) : Promise<Group> {
        ow(groupName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupRelativeUrl(groupName)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async deleteGroupByName(groupName:string, additionalHeaders?:RequestHeaders) : Promise<void> {
        ow(groupName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupRelativeUrl(groupName)}`;
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async listByTemplate(templateName:string, additionalHeaders?:RequestHeaders) : Promise<GroupList> {
        ow(templateName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupsByTemplateRelativeUrl(templateName)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listByTemplateVersion(templateName:string, versionNo:number, additionalHeaders?:RequestHeaders) : Promise<GroupList> {
        ow(templateName, ow.string.nonEmpty);
        ow(versionNo, ow.number.greaterThan(0));

        const url = `${this.baseUrl}${super.groupsByTemplateVersionRelativeUrl(templateName, versionNo)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }
}
