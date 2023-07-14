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
import { TypeCategory } from '../types/constants';
import {
    ModelAttributeValue,
    StringArrayMap,
    DirectionToStringArrayMap,
    DirectionToRelatedEntityArrayMap,
    RelationDirection,
} from '../data/model';
import { DeviceItem, DeviceBaseResource } from '../devices/devices.models';

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
    groups?: StringArrayMap = {};
}

export class Group20Resource extends GroupBaseResource {
    groups?: DirectionToStringArrayMap = {};
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

    groups?: DirectionToRelatedEntityArrayMap = {};
    attributes?: { [key: string]: ModelAttributeValue } = {};

    // used for optimistic locking in 'lite' mode
    version?: number;

    // populated for related resources
    relation?: string;
    direction?: RelationDirection;

    public constructor(init?: Partial<GroupItem>) {
        Object.assign(this, init);
    }

    public listRelatedGroupPaths(): string[] {
        const relatedGroupPaths: string[] = [];
        if (this.groups?.in) {
            Object.values(this.groups.in).forEach((relations) =>
                relations.forEach((relation) => relatedGroupPaths.push(relation.id.toLowerCase())),
            );
        }
        if (this.groups?.out) {
            Object.values(this.groups.out).forEach((relations) =>
                relations.forEach((relation) => relatedGroupPaths.push(relation.id.toLowerCase())),
            );
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
    toBeDetermined: GroupBaseResource,
): toBeDetermined is Group20Resource {
    const asV2 = toBeDetermined as Group20Resource;
    if (asV2.groups && (asV2.groups.in || asV2.groups.out)) {
        return true;
    }
    return false;
}

export function determineIfGroupItem(toBeDetermined: unknown): toBeDetermined is GroupItem {
    const asV2 = toBeDetermined as GroupItem;
    if (asV2.groupPath) {
        return true;
    }
    return false;
}
