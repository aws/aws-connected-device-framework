/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { GroupItem, BulkGroupsResult, GroupMemberItemList, GroupItemList} from './groups.models';
import {TypeCategory} from '../types/constants';
import { DeviceItemList } from '../devices/devices.models';

export interface GroupsService {

    get(groupPath: string): Promise<GroupItem> ;

    createBulk(request:GroupItem[], applyProfile?:string) : Promise<BulkGroupsResult> ;

    create(model:GroupItem, applyProfile?:string) : Promise<string> ;

    update(model: GroupItem, applyProfile?:string) : Promise<void> ;

    getMembers(groupPath:string, category:TypeCategory, type:string, states:string, offset?:number, count?:number): Promise<GroupMemberItemList> ;

    getParentGroups(groupPath:string): Promise<GroupItem[]> ;

    delete(groupPath: string) : Promise<void> ;

    attachToGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> ;

    detachFromGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> ;

    listRelatedGroups(groupPath: string, relationship: string, direction:string, template:string, offset:number, count:number) : Promise<GroupItemList>;

    listRelatedDevices(groupPath: string, relationship: string, direction:string, template:string, state:string, offset:number, count:number) : Promise<DeviceItemList>;

}
