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
