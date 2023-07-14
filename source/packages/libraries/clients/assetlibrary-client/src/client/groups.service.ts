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
import { injectable } from 'inversify';
import { PathHelper } from '../utils/path.helper';
import { RequestHeaders } from './common.model';
import { ClientServiceBase } from './common.service';
import { DeviceResourceList, DeviceState } from './devices.model';
import {
    BulkLoadGroups,
    BulkLoadGroupsResponse,
    Group10Resource,
    Group20Resource,
    GroupResourceList,
} from './groups.model';

export interface GroupsService {
    /**
     * Adds a new group to the device library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     *
     * @throws {HttpError}
     */
    createGroup(
        body: Group10Resource | Group20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<string>;

    /**
     * Adds a batch of new group to the asset library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     *
     * @throws {HttpError}
     */
    bulkCreateGroup(
        body: BulkLoadGroups,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<BulkLoadGroupsResponse>;

    /**
     * Delete group with supplied path
     * Deletes a single group
     * @param groupPath Path of group to return
     *
     * @throws {HttpError}
     */
    deleteGroup(groupPath: string, additionalHeaders?: RequestHeaders): Promise<void>;

    /**
     * Find group by Group&#39;s path
     * Returns a single group
     * @param groupPath Path of group to return
     *
     * @throws {HttpError}
     */
    getGroup(
        groupPath: string,
        additionalHeaders?: RequestHeaders,
        includeGroups?: boolean,
    ): Promise<Group10Resource | Group20Resource>;

    /**
     * List device members of group for supplied Group name
     * Returns device members of group
     * @param groupPath Path of group to return its device members. A path of &#39;/&#39; can be passed as id to return top level device members
     * @param template Optional filter to return a specific device sub-type
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     *
     * @throws {HttpError}
     */
    listGroupMembersDevices(
        groupPath: string,
        template?: string,
        state?: DeviceState,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders,
    ): Promise<DeviceResourceList>;

    /**
     * List group members of group for supplied Group name
     * Returns group members of group
     * @param groupPath Path of group to return its group members. A path of &#39;/&#39; can be passed as id to return top level group members
     * @param template Optional filter to return a specific group sub-type
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     *
     * @throws {HttpError}
     */
    listGroupMembersGroups(
        groupPath: string,
        template?: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders,
    ): Promise<GroupResourceList>;

    /**
     * List all ancestor groups of a specific group.
     * List all ancestor groups of a specific group.s
     * @param groupPath Path of group for fetching the membership
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     *
     * @throws {HttpError}
     */
    listGroupMemberships(
        groupPath: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders,
    ): Promise<GroupResourceList>;

    /**
     * Update an existing group attributes, including changing its parent group.
     *
     * @param groupPath Path of group to return
     * @param body Group object that needs to be updated
     *
     * @throws {HttpError}
     */
    updateGroup(
        groupPath: string,
        body: Group10Resource | Group20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<void>;

    attachToGroup(
        sourceGroupPath: string,
        relationship: string,
        targetGroupPath: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<void>;

    detachFromGroup(
        sourceGroupPath: string,
        relationship: string,
        targetGroupPath: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<void>;

    /**
     * List all related groups of a specific group.
     * @param groupPath Path of group for fetching the membership
     * @param relationship The relationship between the group and groups
     * @param template Optional filter to return a specific device sub-type
     * @param direction Optional filter to return a specific direction
     * @param offset Optional The index to start paginated results from
     * @param count Optional The maximum number of results to return
     * @param sort Optional The result returned by the specific sort
     *
     * @throws {HttpError}
     */
    listGroupRelatedGroups(
        groupPath: string,
        relationship: string,
        template?: string,
        direction?: string,
        offset?: number,
        count?: number,
        sort?: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<GroupResourceList>;

    /**
     * List all related devices of a specific group.
     * @param groupPath Path of group for fetching the membership
     * @param relationship The relationship between the group and groups
     * @param template Optional filter to return a specific device sub-type
     * @param direction Optional filter to return a specific direction
     * @param state Optional filter to return a specific state
     * @param offset Optional The index to start paginated results from
     * @param count Optional The maximum number of results to return
     * @param sort Optional The result returned by the specific sort
     */
    listGroupRelatedDevices(
        groupPath: string,
        relationship: string,
        template?: string,
        direction?: string,
        state?: DeviceState,
        offset?: number,
        count?: number,
        sort?: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<DeviceResourceList>;
}

@injectable()
export class GroupsServiceBase extends ClientServiceBase {
    constructor() {
        super();
    }

    protected groupsRelativeUrl(): string {
        return '/groups';
    }

    protected groupRelativeUrl(groupPath: string): string {
        return PathHelper.encodeUrl('groups', groupPath);
    }

    protected bulkGroupsRelativeUrl(): string {
        return '/bulkgroups';
    }

    protected groupDeviceMembersRelativeUrl(groupPath: string): string {
        return PathHelper.encodeUrl('groups', groupPath, 'members', 'devices');
    }

    protected groupGroupMembersRelativeUrl(groupPath: string): string {
        return PathHelper.encodeUrl('groups', groupPath, 'members', 'groups');
    }

    protected groupMembershipsRelativeUrl(groupPath: string): string {
        return PathHelper.encodeUrl('groups', groupPath, 'memberships');
    }

    protected groupAttachedGroupRelativeUrl(
        sourceGroupPath: string,
        relationship: string,
        targetGroupPath: string,
    ): string {
        return PathHelper.encodeUrl(
            'groups',
            sourceGroupPath,
            relationship,
            'groups',
            targetGroupPath,
        );
    }

    protected groupRelatedGroupUrl(groupPath: string, relationship: string): string {
        return PathHelper.encodeUrl('groups', groupPath, relationship, 'groups');
    }

    protected groupRelatedDeviceUrl(groupPath: string, relationship: string): string {
        return PathHelper.encodeUrl('groups', groupPath, relationship, 'devices');
    }
}
