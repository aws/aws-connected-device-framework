/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {GroupBaseResource} from '../groups/groups.models';
import { DeviceBaseResource} from '../devices/devices.models';

export enum SearchRequestFilterDirection {
	in = 'in',
	out = 'out'
}
export type SearchRequestFilterTraversal =  {
	relation?: string;
	direction?: SearchRequestFilterDirection;
};
export type SearchRequestFilter = {
	traversals?: SearchRequestFilterTraversal[];
	field: string;
	value: string | number | boolean;
};
export type SearchRequestFacet = {
	traversals?: SearchRequestFilterTraversal[];
	field: string;
};
export type SearchRequestFilters = SearchRequestFilter[];

export class SearchRequestModel {
	types?: string[]=[];
	ancestorPath?: string;

	eq?: SearchRequestFilters;
	neq?: SearchRequestFilters;
	lt?: SearchRequestFilters;
	lte?: SearchRequestFilters;
	gt?: SearchRequestFilters;
	gte?: SearchRequestFilters;
	startsWith?: SearchRequestFilters;
	endsWith?: SearchRequestFilters;
	contains?: SearchRequestFilters;

	exists?: SearchRequestFilters;
	nexists?: SearchRequestFilters;

	facetField?: SearchRequestFacet;

	summarize: boolean;

}

export type FacetResults = {[key:string]: number};
export interface SearchResultsResource {
	results: (GroupBaseResource|DeviceBaseResource)[] | FacetResults;
	pagination?: {
		offset: string|number;
		count: number;
	};
	total?: number;
}
