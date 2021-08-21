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

export interface CategoryEventsRequest {
    timeFrom?:string;
    timeTo?:string;
    user?:string;
    event?:string;

    sort?:SortDirection;
    token?:string;
    limit?:number;
}

export interface ObjectEventsRequest {
    category:string;
    objectId:string;

    timeAt?:string;
    timeFrom?:string;
    timeTo?:string;
    user?:string;
    event?:string;

    sort?:SortDirection;
    token?:string;
    limit?:number;
}

export interface Event {
	objectId:string;
	type:Category;
	time:string;
	event:EventType;
	user:string;
	state:string;
}

export interface Events {
	events:Event[];
	pagination?: {
		token:string,
		limit:number
	};
}

export enum Category {
	devices = 'devices',
	groups = 'groups',
	deviceTemplates = 'deviceTemplates',
	groupTemplates = 'groupTemplates',
	policies = 'policies'
}

export enum EventType {
	create = 'create',
	modify = 'modify',
	delete = 'delete'
}

export enum SortDirection {
    asc = 'asc',
    desc = 'desc'
}

export interface RequestHeaders {
    [key:string] : string;
}
