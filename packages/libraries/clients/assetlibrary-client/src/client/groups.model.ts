/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Pagination } from './pagination.model';

/**
 * Connected Device Framework: Dashboard Facade Group
*/

export interface Group {
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

    /**
     * Paths of the groups that this group is associated with.
     */
    groups?: { [key: string]: string[]; };
}

export interface BulkLoadGroups {
    groups: Group[];
}

export interface GroupList {
    results?: Group[];
    pagination?: Pagination;
}
