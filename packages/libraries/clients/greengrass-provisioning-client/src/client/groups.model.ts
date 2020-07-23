/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export class Group {
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

export class GroupList {
	groups: Group[] = [];
	pagination?: {
		offset:number|string;
		count: number;
	};
}
