import {
    BulkLoadGroups,
    BulkLoadGroupsResponse,
    Group10Resource,
    Group20Resource,
    GroupResourceList,
} from './groups.model';
import {DeviceResourceList, DeviceState} from './devices.model';
import {RequestHeaders} from './common.model';
import {ClientServiceBase} from './common.service';
import {PathHelper} from '../utils/path.helper';
import {injectable} from 'inversify';

export interface GroupsService {
    /**
     * Adds a new group to the device library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     */
    createGroup(body: Group10Resource | Group20Resource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Adds a batch of new group to the asset library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     */
    bulkCreateGroup(body: BulkLoadGroups, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<BulkLoadGroupsResponse>;

    /**
     * Delete group with supplied path
     * Deletes a single group
     * @param groupPath Path of group to return
     */
    deleteGroup(groupPath: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Find group by Group&#39;s path
     * Returns a single group
     * @param groupPath Path of group to return
     */
    getGroup(groupPath: string, additionalHeaders?:RequestHeaders): Promise<Group10Resource | Group20Resource>;

    /**
     * List device members of group for supplied Group name
     * Returns device members of group
     * @param groupPath Path of group to return its device members. A path of &#39;/&#39; can be passed as id to return top level device members
     * @param template Optional filter to return a specific device sub-type
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    listGroupMembersDevices(groupPath: string, template?: string, state?: DeviceState, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<DeviceResourceList>;

    /**
     * List group members of group for supplied Group name
     * Returns group members of group
     * @param groupPath Path of group to return its group members. A path of &#39;/&#39; can be passed as id to return top level group members
     * @param template Optional filter to return a specific group sub-type
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    listGroupMembersGroups(groupPath: string, template?: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<GroupResourceList>;

    /**
     * List all ancestor groups of a specific group.
     * List all ancestor groups of a specific group.s
     * @param groupPath Path of group for fetching the membership
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    listGroupMemberships(groupPath: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<GroupResourceList>;

    /**
     * Update an existing group attributes, including changing its parent group.
     *
     * @param groupPath Path of group to return
     * @param body Group object that needs to be updated
     */
    updateGroup(groupPath: string, body: Group10Resource | Group20Resource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<void>;

    attachToGroup(sourceGroupPath: string, relationship: string, targetGroupPath: string, additionalHeaders?:RequestHeaders): Promise<void>;

    detachFromGroup(sourceGroupPath: string, relationship: string, targetGroupPath: string, additionalHeaders?:RequestHeaders): Promise<void>;
}

@injectable()
export class GroupsServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected groupsRelativeUrl() : string {
        return '/groups';
    }

    protected groupRelativeUrl(groupPath: string) : string {
        return PathHelper.encodeUrl('groups', groupPath);
    }

    protected bulkGroupsRelativeUrl() : string {
        return '/bulkgroups';
    }

    protected groupDeviceMembersRelativeUrl(groupPath: string) : string {
        return PathHelper.encodeUrl('groups', groupPath, 'members', 'devices');
    }

    protected groupGroupMembersRelativeUrl(groupPath: string) : string {
        return PathHelper.encodeUrl('groups', groupPath, 'members', 'groups');
    }

    protected groupMembershipsRelativeUrl(groupPath: string) : string {
        return PathHelper.encodeUrl('groups', groupPath, 'memberships');
    }

    protected groupAttachedGroupRelativeUrl(sourceGroupPath: string, relationship: string, targetGroupPath: string) : string {
        return PathHelper.encodeUrl('groups', sourceGroupPath, relationship, 'groups', targetGroupPath);
    }

}
