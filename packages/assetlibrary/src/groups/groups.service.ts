/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { GroupModel, BulkLoadGroupsRequest, BulkLoadGroupsResult, GroupsMembersModel} from './groups.models';
import {TypeCategory} from '../types/constants';

export interface GroupsService {

    get(groupPath: string): Promise<GroupModel> ;

    createBulk(request:BulkLoadGroupsRequest, applyProfile?:string) : Promise<BulkLoadGroupsResult> ;

    create(model:GroupModel, applyProfile?:string) : Promise<string> ;

    update(model: GroupModel, applyProfile?:string) : Promise<void> ;

    getMembers(groupPath:string, category:TypeCategory, type:string, state:string, offset?:number, count?:number): Promise<GroupsMembersModel> ;

    getParentGroups(groupPath:string): Promise<GroupModel[]> ;

    delete(groupPath: string) : Promise<void> ;

    attachToGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> ;

    detachFromGroup(sourceGroupPath:string, relationship:string, targetGroupPath:string) : Promise<void> ;

}
