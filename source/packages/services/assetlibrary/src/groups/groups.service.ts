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
import { SortKeys } from '../data/model';
import { DeviceItemList } from '../devices/devices.models';
import { TypeCategory } from '../types/constants';
import { BulkGroupsResult, GroupItem, GroupItemList, GroupMemberItemList } from './groups.models';

export interface GroupsService {
    get(groupPath: string, includeGroups: boolean): Promise<GroupItem>;

    getBulk(groupPaths: string[], includeGroups: boolean): Promise<GroupItemList>;

    createBulk(request: GroupItem[], applyProfile?: string): Promise<BulkGroupsResult>;

    create(model: GroupItem, applyProfile?: string): Promise<string>;

    update(model: GroupItem, applyProfile?: string): Promise<void>;

    getMembers(
        groupPath: string,
        category: TypeCategory,
        type: string,
        states: string,
        offset?: number,
        count?: number,
        sort?: SortKeys
    ): Promise<GroupMemberItemList>;

    getParentGroups(groupPath: string): Promise<GroupItem[]>;

    delete(groupPath: string): Promise<void>;

    attachToGroup(
        sourceGroupPath: string,
        relationship: string,
        targetGroupPath: string
    ): Promise<void>;

    detachFromGroup(
        sourceGroupPath: string,
        relationship: string,
        targetGroupPath: string
    ): Promise<void>;

    listRelatedGroups(
        groupPath: string,
        relationship: string,
        direction: string,
        template: string,
        offset: number,
        count: number,
        sort: SortKeys
    ): Promise<GroupItemList>;

    listRelatedDevices(
        groupPath: string,
        relationship: string,
        direction: string,
        template: string,
        state: string,
        offset: number,
        count: number,
        sort: SortKeys
    ): Promise<DeviceItemList>;
}
