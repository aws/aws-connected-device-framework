/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {GroupModel} from '../groups/groups.models';
import {DeviceModel} from '../devices/devices.models';

export class SearchRequestModel {
	types?: string[]=[];
	ancestorPath?: string;

	eq?: { [key: string] : string | number | boolean};
	neq?: { [key: string] : string | number | boolean};
	lt?: { [key: string] : number};
	lte?: { [key: string] : number};
	gt?: { [key: string] : number};
	gte?: { [key: string] : number};
	startsWith?: { [key: string] : string};
	endsWith?: { [key: string] : string};
	contains?: { [key: string] : string};

	summarize: boolean;

}

export interface SearchResultsModel {
	results: (GroupModel|DeviceModel)[];
	pagination?: {
		offset:number;
		count: number;
	};
	total?: number;
}
