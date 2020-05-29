/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export class TemplateResource {
	name: string;
	versionNo: number;
	groupId?: string;
	groupVersionId?: string;
	createdAt?: Date;
	updatedAt?: Date;
	enabled: boolean;
}

export class TemplateResourceList {
	templates: TemplateResource[] = [];
	pagination?: {
		offset:number|string;
		count: number;
	};
}

export class TemplateItem {
	name: string;
	versionNo: number;
	groupId?: string;
	groupVersionId?: string;
	createdAt?: Date;
	updatedAt?: Date;
	enabled: boolean;
}

export class TemplateItemList {
	templates: TemplateItem[] = [];
	pagination?: {
		offset:number|string;
		count: number;
	};
}
