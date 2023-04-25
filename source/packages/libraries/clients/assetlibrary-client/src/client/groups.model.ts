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
import { DirectionStringToArrayMap, StringToArrayMap } from './common.model';

/**
 * AWS Connected Device Framework: Dashboard Facade Group
 */

export interface GroupBaseResource {
    /**
     * Path of the group.
     */
    groupPath?: string;
    /**
     * Category, always `group` for a group.
     */
    category?: string;
    /**
     * Template of group.  Use 'Group' if no custom attributes are required.
     */
    templateId?: string;
    /**
     * name of group.
     */
    name?: string;
    /**
     * Path of the groups parent.
     */
    parentPath?: string;
    /**
     * Description of the group.
     */
    description?: string;
    attributes?: { [key: string]: string | number | boolean | null };
}

export interface Group10Resource extends GroupBaseResource {
    groups?: StringToArrayMap;
}

export interface Group20Resource extends GroupBaseResource {
    groups?: DirectionStringToArrayMap;
}

export interface BulkLoadGroups {
    groups: GroupBaseResource[];
}

export class BulkLoadGroupsResponse {
    success: number;
    failed: number;
    total: number;
    errors: { [key: string]: string };
}

export interface GroupResourceList {
    results: GroupBaseResource[];
    pagination?: {
        offset: number;
        count: number;
    };
}
