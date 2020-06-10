/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { GroupBaseResource } from './groups.model';
import { DeviceBaseResource } from './devices.model';

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

	public clone(other:SearchRequestModel) {
		this.types = other.types;
		this.ancestorPath = other.ancestorPath;
		this.eq = other.eq;
		this.neq = other.neq;
		this.lt = other.lt;
		this.lte = other.lte;
		this.gt = other.gt;
		this.gte = other.gte;
		this.startsWith = other.startsWith;
		this.endsWith = other.endsWith;
		this.contains = other.contains;
		this.facetField = other.facetField;
		this.summarize = other.summarize;
	}

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

	public toHttpQueryString():string {
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

	public toLambdaMultiValueQueryString(): {[key:string]:string[]} {
		const qs:{[key:string]:string[]}= {};

		if (this.types) {
			qs['type']= this.types.map(v=> v);
		}

		if (this.ancestorPath) {
			qs['ancestorPath']=[this.ancestorPath];
		}

		if (this.eq) {
			const values=this.buildQSValues('eq', this.eq);
			qs['eq'] = values.map(v=> v.split('=')[1]);
		}

		if (this.neq) {
			const values=this.buildQSValues('neq', this.neq);
			qs['neq'] = values.map(v=> v.split('=')[1]);
		}

		if (this.lt) {
			const values=this.buildQSValues('lt', this.lt);
			qs['lt'] = values.map(v=> v.split('=')[1]);
		}

		if (this.lte) {
			const values=this.buildQSValues('lte', this.lte);
			qs['lte'] = values.map(v=> v.split('=')[1]);
		}

		if (this.gt) {
			const values=this.buildQSValues('gt', this.gt);
			qs['gt'] = values.map(v=> v.split('=')[1]);
		}

		if (this.gte) {
			const values=this.buildQSValues('gte', this.gte);
			qs['gte'] = values.map(v=> v.split('=')[1]);
		}

		if (this.startsWith) {
			const values=this.buildQSValues('startsWith', this.startsWith);
			qs['startsWith'] = values.map(v=> v.split('=')[1]);
		}

		if (this.endsWith) {
			const values=this.buildQSValues('endsWith', this.endsWith);
			qs['endsWith'] = values.map(v=> v.split('=')[1]);
		}

		if (this.contains) {
			const values=this.buildQSValues('contains', this.contains);
			qs['contains'] = values.map(v=> v.split('=')[1]);
		}

		if (this.summarize) {
			qs['summarize']=[`${this.summarize}`];
		}

		return qs;
	}

}

export interface SearchResultsModel {
	results: (GroupBaseResource|DeviceBaseResource)[];
	pagination?: {
		offset:number;
		count: number;
	};
	total?:number;
}
