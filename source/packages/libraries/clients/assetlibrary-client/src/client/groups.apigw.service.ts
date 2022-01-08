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
import {QSHelper} from '../utils/qs.helper';
import {
    BulkLoadGroups,
    BulkLoadGroupsResponse,
    Group10Resource,
    Group20Resource,
    GroupResourceList,
} from './groups.model';
import {DeviceResourceList, DeviceState} from './devices.model';
import ow from 'ow';
import * as request from 'superagent';
import {GroupsService, GroupsServiceBase} from './groups.service';
import {RequestHeaders} from './common.model';

@injectable()
export class GroupsApigwService extends GroupsServiceBase implements GroupsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('assetLibrary.baseUrl') as string;
    }

    /**
     * Adds a new group to the device library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     */
    async createGroup(body: Group10Resource | Group20Resource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<string> {
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.groupsRelativeUrl()}`;
        const queryString = QSHelper.getQueryString({applyProfile: applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }
        const res = await request.post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));

        return res.headers['x-groupPath'];
    }

    /**
     * Adds a batch of new group to the asset library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     */
    async bulkCreateGroup(body: BulkLoadGroups, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<BulkLoadGroupsResponse> {
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.bulkGroupsRelativeUrl()}`;
        const queryString = QSHelper.getQueryString({applyProfile: applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }
        const res = await request.post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    /**
     * Delete group with supplied path
     * Deletes a single group
     * @param groupPath Path of group to return
     */
    async deleteGroup(groupPath: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(groupPath,'groupPath', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupRelativeUrl(groupPath)}`;

        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    /**
     * Find group by Group&#39;s path
     * Returns a single group
     * @param groupPath Path of group to return
     */
    async getGroup(groupPath: string, additionalHeaders?:RequestHeaders, includeGroups?:boolean): Promise<Group10Resource | Group20Resource> {
        ow(groupPath,'groupPath', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupRelativeUrl(groupPath)}`;
        const qs = QSHelper.getQueryString({includeGroups});       
        if (qs) {
            url += `?${qs}`;
        }
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    /**
     * List device members of group for supplied Group name
     * Returns device members of group
     * @param groupPath Path of group to return its device members. A path of &#39;/&#39; can be passed as id to return top level device members
     * @param template Optional filter to return a specific device sub-type
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    async listGroupMembersDevices(groupPath: string, template?: string, state?: DeviceState, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<DeviceResourceList> {
        ow(groupPath,'groupPath', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupDeviceMembersRelativeUrl(groupPath)}`;
        const queryString = QSHelper.getQueryString({template, state, offset, count});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    /**
     * List group members of group for supplied Group name
     * Returns group members of group
     * @param groupPath Path of group to return its group members. A path of &#39;/&#39; can be passed as id to return top level group members
     * @param template Optional filter to return a specific group sub-type
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    async listGroupMembersGroups(groupPath: string, template?: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<GroupResourceList> {
        ow(groupPath,'groupPath', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupGroupMembersRelativeUrl(groupPath)}`;
        const queryString = QSHelper.getQueryString({template, offset, count});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    /**
     * List all ancestor groups of a specific group.
     * List all ancestor groups of a specific group.s
     * @param groupPath Path of group for fetching the membership
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    async listGroupMemberships(groupPath: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<GroupResourceList> {
        ow(groupPath,'groupPath', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupMembershipsRelativeUrl(groupPath)}`;
        const queryString = QSHelper.getQueryString({offset, count});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    /**
     * Update an existing group attributes, including changing its parent group.
     *
     * @param groupPath Path of group to return
     * @param body Group object that needs to be updated
     */
    async updateGroup(groupPath: string, body: Group10Resource | Group20Resource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(groupPath,'groupPath', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.groupRelativeUrl(groupPath)}`;
        const queryString = QSHelper.getQueryString({applyProfile: applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }

        await request.patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));
    }

    async attachToGroup(sourceGroupPath: string, relationship: string, targetGroupPath: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(sourceGroupPath, 'sourceGroupPath',ow.string.nonEmpty);
        ow(relationship,'relationship', ow.string.nonEmpty);
        ow(targetGroupPath, 'targetGroupPath',ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupAttachedGroupRelativeUrl(sourceGroupPath, relationship, targetGroupPath)}`;
        await request.put(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    async detachFromGroup(sourceGroupPath: string, relationship: string, targetGroupPath: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(sourceGroupPath, 'sourceGroupPath',ow.string.nonEmpty);
        ow(relationship,'relationship', ow.string.nonEmpty);
        ow(targetGroupPath, 'targetGroupPath',ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupAttachedGroupRelativeUrl(sourceGroupPath, relationship, targetGroupPath)}`;

        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

    /**
     * List all related groups of a specific group.
     * @param groupPath Path of group for fetching the membership
     * @param relationship The relationship between the group and groups
     * @param template Optional filter to return a specific device sub-type
     * @param direction Optional filter to return a specific direction
     * @param offset Optional The index to start paginated results from
     * @param count Optional The maximum number of results to return
     * @param sort Optional The result returned by the specific sort
     */
    async listGroupRelatedGroups(groupPath: string, relationship: string, template?: string, direction?: string, offset?: number, count?: number, sort?: string, additionalHeaders?:RequestHeaders): Promise<GroupResourceList> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);
        ow(relationship, 'relationship',ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupRelatedGroupUrl(groupPath,relationship)}`;

        let queryString="";
        if (template != undefined && template.trim().length > 0) {
            queryString = queryString + "&template="+template;
        }
        if (direction != undefined && direction.trim().length > 0 ) {
            queryString = queryString + "&direction="+direction;
        }
        if (offset != undefined ) {
            if (String(offset).trim().length > 0) {
                queryString = queryString + "&offset="+offset;
            }
        }
        if (count != undefined) {
            if (String(count).trim().length > 0) {
                queryString = queryString + "&count="+count;
            }
        }
        if (sort != undefined && sort.trim().length > 0 ) {
            queryString = queryString + "&sort="+sort;
        }
        if (queryString ) {
            queryString = queryString.slice(1);
        }

        if (queryString) {
            url += `?${queryString}`;
        }
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

}
