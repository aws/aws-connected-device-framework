/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { TypeCategory } from '../types/constants';
import { ModelAttributeValue, StringToArrayMap, DirectionStringToArrayMap } from '../data/model';
import { DeviceItem, DeviceBaseResource } from '../devices/devices.models';

export class GroupBaseResource {
	name: string;
	category?: TypeCategory;
	groupPath?: string;
	templateId: string;
	description?: string;
	parentPath: string;

	attributes?: { [key: string] : ModelAttributeValue} = {};

	// used for optimistic locking in 'lite' mode
	version?: number;

	// populated for related resources
	relation?: string;
	direction?: string;

}

export class Group10Resource extends GroupBaseResource {
	groups?: StringToArrayMap = {};
}

export class Group20Resource extends GroupBaseResource {
	groups?: DirectionStringToArrayMap = {};
}

export class GroupResourceList {
	results: GroupBaseResource[];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export class GroupItem {
	name: string;
	category?: TypeCategory;
	groupPath?: string;
	templateId: string;
	description?: string;
	parentPath: string;

	groups?: DirectionStringToArrayMap = {};
	attributes?: { [key: string] : ModelAttributeValue} = {};

	// used for optimistic locking in 'lite' mode
	version?: number;

	// populated for related resources
	relation?: string;
	direction?: string;

	public constructor(init?:Partial<GroupItem>) {
        Object.assign(this, init);
    }

	public listRelatedGroupPaths():string[] {
		const relatedGroupPaths:string[]= [];
		if (this.groups) {
			if (this.groups.in) {
				Object.keys(this.groups.in).forEach(k=> relatedGroupPaths.push(...this.groups.in[k]));
			}
			if (this.groups.out) {
				Object.keys(this.groups.out).forEach(k=> relatedGroupPaths.push(...this.groups.out[k]));
			}
		}
		return relatedGroupPaths;
	}
}

export interface GroupItemList {
    results: GroupItem[];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export interface GroupMemberResourceList {
    results: (GroupBaseResource|DeviceBaseResource)[];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export interface GroupMemberItemList {
    results: (GroupItem|DeviceItem)[];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export class BulkGroupsResource {
    groups: GroupBaseResource[];
}

export class BulkGroupsResult {
    success: number;
    failed: number;
    total: number;
    errors: {[key:string]:string};
}

export function determineIfGroup20Resource(toBeDetermined: GroupBaseResource): toBeDetermined is Group20Resource {
	const asV2 = toBeDetermined as Group20Resource;
	if(asV2.groups && (asV2.groups.in || asV2.groups.out)) {
		return true;
	}
	return false;
}

export function determineIfGroupItem(toBeDetermined: any): toBeDetermined is GroupItem {
	const asV2 = toBeDetermined as GroupItem;
	if(asV2.groupPath) {
		return true;
	}
	return false;
}
