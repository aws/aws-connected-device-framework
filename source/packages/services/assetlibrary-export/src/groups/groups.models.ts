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
import { DirectionStringToArrayMap, ModelAttributeValue, StringToArrayMap } from '../data/model';
import { DeviceBaseResource, DeviceItem } from '../devices/devices.models';
import { TypeCategory } from '../types/constants';

export class GroupBaseResource {
    name: string;
    category?: TypeCategory;
    groupPath?: string;
    templateId: string;
    description?: string;
    parentPath: string;

    attributes?: { [key: string]: ModelAttributeValue } = {};

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
        offset: number | string;
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
    attributes?: { [key: string]: ModelAttributeValue } = {};

    // used for optimistic locking in 'lite' mode
    version?: number;

    // populated for related resources
    relation?: string;
    direction?: string;

    public constructor(init?: Partial<GroupItem>) {
        Object.assign(this, init);
    }

    public listRelatedGroupPaths(): string[] {
        const relatedGroupPaths: string[] = [];
        if (this.groups) {
            if (this.groups.in) {
                Object.keys(this.groups.in).forEach((k) =>
                    relatedGroupPaths.push(...this.groups.in[k])
                );
            }
            if (this.groups.out) {
                Object.keys(this.groups.out).forEach((k) =>
                    relatedGroupPaths.push(...this.groups.out[k])
                );
            }
        }
        return relatedGroupPaths;
    }
}

export interface GroupItemList {
    results: GroupItem[];
    pagination?: {
        offset: number | string;
        count: number;
    };
}

export interface GroupMemberResourceList {
    results: (GroupBaseResource | DeviceBaseResource)[];
    pagination?: {
        offset: number | string;
        count: number;
    };
}

export interface GroupMemberItemList {
    results: (GroupItem | DeviceItem)[];
    pagination?: {
        offset: number | string;
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
    errors: { [key: string]: string };
}

export function determineIfGroup20Resource(
    toBeDetermined: GroupBaseResource
): toBeDetermined is Group20Resource {
    const asV2 = toBeDetermined as Group20Resource;
    if (asV2.groups && (asV2.groups.in || asV2.groups.out)) {
        return true;
    }
    return false;
}

export function determineIfGroupItem(toBeDetermined: any): toBeDetermined is GroupItem {
    const asV2 = toBeDetermined as GroupItem;
    if (asV2.groupPath) {
        return true;
    }
    return false;
}
