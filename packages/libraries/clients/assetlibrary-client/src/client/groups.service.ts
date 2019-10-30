/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * AssetLibrary Implementation of GroupsService *
*/

import { injectable } from 'inversify';
import { QSHelper } from '../utils/qs.helper';
import { BulkLoadGroups, BulkLoadGroupsResponse, Group10Resource, Group20Resource, GroupResourceList } from './groups.model';
import { DeviceState, DeviceResourceList } from './devices.model';
import ow from 'ow';
import { PathHelper } from '../utils/path.helper';
import * as request from 'superagent';
import { ClientService, ClientOptions } from './common.service';

@injectable()
export class GroupsService extends ClientService {

    public constructor(options?:ClientOptions) {
        super(options);
    }


    /**
     * Adds a new group to the device library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     */
    public async createGroup(body: Group10Resource|Group20Resource, applyProfileId?:string): Promise<void> {
        ow(body, ow.object.nonEmpty);

        let url = this.baseUrl + '/groups';
        const queryString = QSHelper.getQueryString({applyProfile:applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }
        await request.post(url)
            .send(body)
            .set(super.getHeaders());
    }

    /**
     * Adds a batch of new group to the asset library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     */
    public async bulkCreateGroup(body: BulkLoadGroups, applyProfileId?:string): Promise<BulkLoadGroupsResponse> {
        ow(body, ow.object.nonEmpty);

        let url = this.baseUrl + '/bulkgroups';
        const queryString = QSHelper.getQueryString({applyProfile:applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }
        const res = await request.post(url)
            .send(body)
            .set(super.getHeaders());

        return res.body;
    }

    /**
     * Delete group with supplied path
     * Deletes a single group
     * @param groupPath Path of group to return
     */
    public async deleteGroup(groupPath: string): Promise<void> {
        ow(groupPath, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('groups', groupPath);

        await request.delete(url)
            .set(super.getHeaders());
     }

    /**
     * Find group by Group&#39;s path
     * Returns a single group
     * @param groupPath Path of group to return
     */
    public async getGroup(groupPath: string): Promise<Group10Resource|Group20Resource> {
        ow(groupPath, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('groups', groupPath);

        const res = await request.get(url)
            .set(super.getHeaders());

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
    public async listGroupMembersDevices(groupPath: string, template?: string, state?: DeviceState, offset?: number, count?: number): Promise<DeviceResourceList> {
        ow(groupPath, ow.string.nonEmpty);

        let url = this.baseUrl + PathHelper.encodeUrl('groups', groupPath, 'members', 'devices');
        const queryString = QSHelper.getQueryString({template, state, offset, count});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
        .set(super.getHeaders());

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
    public async listGroupMembersGroups(groupPath: string, template?: string, offset?: number, count?: number): Promise<GroupResourceList> {
        ow(groupPath, ow.string.nonEmpty);

        let url = this.baseUrl + PathHelper.encodeUrl('groups', groupPath, 'members', 'groups');
        const queryString = QSHelper.getQueryString({template, offset, count});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(super.getHeaders());

        return  res.body;
    }

    /**
     * List all ancestor groups of a specific group.
     * List all ancestor groups of a specific group.s
     * @param groupPath Path of group for fetching the membership
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    public async listGroupMemberships(groupPath: string, offset?: number, count?: number): Promise<GroupResourceList> {
        ow(groupPath, ow.string.nonEmpty);

        let url = this.baseUrl + PathHelper.encodeUrl('groups', groupPath, 'memberships');
        const queryString = QSHelper.getQueryString({offset, count});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
        .set(super.getHeaders());

        return res.body;
    }

    /**
     * Update an existing group attributes, including changing its parent group.
     *
     * @param groupPath Path of group to return
     * @param body Group object that needs to be updated
     */
    public async updateGroup(groupPath: string, body: Group10Resource|Group20Resource, applyProfileId?:string): Promise<void> {
        ow(groupPath, ow.string.nonEmpty);
        ow(body, ow.object.nonEmpty);

        let url = this.baseUrl + PathHelper.encodeUrl('groups', groupPath);
        const queryString = QSHelper.getQueryString({applyProfile:applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }

        await request.patch(url)
            .send(body)
            .set(super.getHeaders());
    }

    public async attachToGroup(sourceGroupPath: string, relationship: string, targetGroupPath: string): Promise<void> {
        ow(sourceGroupPath, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(targetGroupPath, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('groups', sourceGroupPath, relationship, 'groups', targetGroupPath);
        await request.put(url)
            .set(super.getHeaders());
      }

    public async detachFromGroup(sourceGroupPath: string, relationship: string, targetGroupPath: string): Promise<void> {
        ow(sourceGroupPath, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(targetGroupPath, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('groups', sourceGroupPath, relationship, 'groups', targetGroupPath);

         await request.delete(url)
            .set(super.getHeaders());
    }
}
