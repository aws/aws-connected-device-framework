/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Group } from './groups.model';
import { Device } from './devices.model';

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

	facetField?: SearchRequestFacet;

	summarize?: boolean;

	private buildQSValues(qsParam:string, filters:SearchRequestFilters) : string[] {
		const qs:string[]= [];

		if (filters===undefined) {
			return qs;
		}

		filters.forEach(f=> {
			let v = `${qsParam}=`;
			if (f.traversals!==undefined) {
				f.traversals.forEach(t=> {
					v+=`${t.relation}:${t.direction}:`;
				});
			}
			v+=`${f.field}:${f.value}`;
			qs.push(v);
		});

		return qs;
	}

	public toQueryString():string {
		let qs:string[]= [];

		if (this.types) {
			this.types.forEach(k=> qs.push(`type=${k}`));
		}

		if (this.ancestorPath) {
			qs.push(`ancestorPath=${this.ancestorPath}`);
		}

		if (this.eq) {
			qs = qs.concat(this.buildQSValues('eq', this.eq));
		}

		if (this.neq) {
			qs = qs.concat(this.buildQSValues('neq', this.neq));
		}

		if (this.lt) {
			qs = qs.concat(this.buildQSValues('lt', this.lt));
		}

		if (this.lte) {
			qs = qs.concat(this.buildQSValues('lte', this.lte));
		}

		if (this.gt) {
			qs = qs.concat(this.buildQSValues('gt', this.gt));
		}

		if (this.gte) {
			qs = qs.concat(this.buildQSValues('gte', this.gte));
		}

		if (this.startsWith) {
			qs = qs.concat(this.buildQSValues('startsWith', this.startsWith));
		}

		if (this.endsWith) {
			qs = qs.concat(this.buildQSValues('endsWith', this.endsWith));
		}

		if (this.contains) {
			qs = qs.concat(this.buildQSValues('contains', this.contains));
		}

		if (this.summarize) {
			qs.push(`summarize=${this.summarize}`);
		}

		return qs.join('&');
	}

}

export interface SearchResultsModel {
	results: (Group|Device)[];
	pagination?: {
		offset:number;
		count: number;
	};
	total?:number;
}
