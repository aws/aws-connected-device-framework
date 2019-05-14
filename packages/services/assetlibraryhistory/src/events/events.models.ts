
/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface EventModel {
	objectId:string;
	type:Category;
	time:string;
	event:EventType;
	user:string;
	payload:string;
	attributes:{[key:string]: string};
}

export interface StateHistoryModel {
	objectId:string;
	type:Category;
	time:string;
	event:EventType;
	user:string;
	state:string;
}

export interface StateHistoryListModel {
	events:StateHistoryModel[];
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
