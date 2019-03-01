/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {DeviceModel} from '../devices/devices.models';
import { TypeCategory } from '../types/constants';

export type GroupModelAttributeValue = string | number | boolean;
export class GroupModel {
	name: string;
	category?: TypeCategory;
	groupPath?: string;
	templateId: string;
	description?: string;
	parentPath: string;

	groups?: { [key: string] : string[]} = {};
	attributes?: { [key: string] : GroupModelAttributeValue} = {};

	// used for optimistic locking in 'lite' mode
	version?: number;

}

export interface GroupsListModel {
    results: GroupModel[];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export interface GroupsMembersModel {
    results: (GroupModel|DeviceModel)[];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export class BulkLoadGroupsRequest {
    groups: GroupModel[];
}

export class BulkLoadGroupsResult {
    success: number;
    failed: number;
    total: number;
    errors: {[key:string]:string};
}
