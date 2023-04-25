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
import { SortKeys } from '../data/model';
import { DeviceBaseResource } from '../devices/devices.models';
import { GroupBaseResource } from '../groups/groups.models';

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
    types?: string[] = [];
    ntypes?: string[] = [];
    ancestorPath?: string;
    includeAncestor?: boolean;

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

    offset?: number;
    count?: number;
    sort?: SortKeys;
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
