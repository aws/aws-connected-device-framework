/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
}

export class GroupResourceList {
	groups: GroupResource[] = [];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export class GroupItem {
	name: string;
	templateName: string;
	templateVersionNo?: number;
	id?: string;
	arn?: string;
	versionId?: string;
	versionNo?: number;
	deployed?: boolean;
	createdAt?: Date;
	updatedAt?: Date;

	versions?: GroupItem[];
}

export class GroupItemList {
	groups: GroupItem[] = [];
	pagination?: {
		offset:number|string;
		count: number;
	};
}
