import { GreengrassSubscription } from "./subscriptions.model";

/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export class Template {
	name: string;
	versionNo?: number;
	groupId?: string;
	groupVersionId?: string;
	subscriptions?: GreengrassSubscriptionMap;
	createdAt?: Date;
	updatedAt?: Date;
	enabled?: boolean;
}

export interface GreengrassSubscriptionMap {
	[thingType: string] : GreengrassSubscription[];
} 

export class TemplateList {
	templates: Template[] = [];
	pagination?: {
		offset:number|string;
		count: number;
	};
}
