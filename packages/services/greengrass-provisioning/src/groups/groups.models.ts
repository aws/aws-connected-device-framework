/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Pagination } from "../common/common.models";
import { GrouptTaskStatus } from "../groupTasks/groupTaskStatus.models";

export class GroupResource {
	name: string;
	templateName: string;
	templateVersionNo?: number;
	id?: string;
	arn?: string;
	versionId?: string;
	versionNo: number;
	deployed: boolean;
	createdAt?: Date;
	updatedAt?: Date;

	taskStatus?:GrouptTaskStatus;
	statusMessage?:string;
}

export class GroupResourceList {
	groups: GroupResource[] = [];
	pagination?: Pagination;
}

export class GroupItem {
	name: string;
	templateName?: string;
	templateVersionNo?: number;
	id?: string;
	arn?: string;
	versionId?: string;
	versionNo?: number;
	deployed?: boolean;
	createdAt?: Date;
	updatedAt?: Date;

	versions?: GroupItem[];

	taskStatus?:GrouptTaskStatus;
	statusMessage?:string;
}

export class GroupItemList {
	groups: GroupItem[] = [];
	pagination?: Pagination;
}
