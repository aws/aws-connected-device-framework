/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Pagination } from "@cdf/provisioning-client/src";
import { GreengrassSubscriptionItem, GreengrassSubscriptionResource } from "../subscriptions/subscriptions.models";

export interface TemplateResource {
	name: string;
	versionNo: number;
	groupId?: string;
	groupVersionId?: string;
	subscriptions?: GreengrassSubscriptionResourceMap;
	createdAt?: Date;
	updatedAt?: Date;
	enabled: boolean;
}

export interface TemplateResourceList {
	templates: TemplateResource[];
	pagination?: Pagination;
}

export interface TemplateItem {
	name: string;
	versionNo: number;
	groupId?: string;
	groupVersionId?: string;
	subscriptions?: GreengrassSubscriptionItemMap;
	createdAt?: Date;
	updatedAt?: Date;
	enabled?: boolean;
}

export interface TemplateItemList {
	templates: TemplateItem[];
	pagination?: Pagination;
}

export interface GreengrassSubscriptionItemMap {
	[thingType: string] : GreengrassSubscriptionItem[];
} 

export interface GreengrassSubscriptionResourceMap {
	[thingType: string] : GreengrassSubscriptionResource[];
} 
