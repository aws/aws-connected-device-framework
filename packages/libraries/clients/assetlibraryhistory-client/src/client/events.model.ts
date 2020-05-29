
/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
