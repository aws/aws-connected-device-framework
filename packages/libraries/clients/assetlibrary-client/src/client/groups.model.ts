/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { DirectionStringToArrayMap, StringToArrayMap } from './common.model';

/**
 * Connected Device Framework: Dashboard Facade Group
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
    attributes?: { [key: string]: string | number | boolean; };
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
    errors: {[key:string]:string};
}

export interface GroupResourceList {
	results: GroupBaseResource[];
	pagination?: {
		offset:number;
		count: number;
	};
}
