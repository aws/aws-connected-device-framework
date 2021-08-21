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

	public clone(other:SearchRequestModel) : void {
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

	private buildQSValues(qsParam:string, filters:SearchRequestFilters, encodeKey?: boolean) : string[] {
		const qs:string[]= [];

		if (filters===undefined) {
			return qs;
		}

		filters.forEach(f=> {
			let key = `${qsParam}=`;
			let v = '';
			if (f.traversals!==undefined) {
				f.traversals.forEach(t=> {
					v+=`${t.relation}:${t.direction}:`;
				});
			}
			v+=`${f.field}:${encodeURIComponent(f.value)}`;
			key = encodeKey ? `${key}${encodeURIComponent(v)}` : `${key}${v}`;

			qs.push(key);
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
			qs = qs.concat(this.buildQSValues('eq', this.eq, true));
		}

		if (this.neq) {
			qs = qs.concat(this.buildQSValues('neq', this.neq, true));
		}

		if (this.lt) {
			qs = qs.concat(this.buildQSValues('lt', this.lt, true));
		}

		if (this.lte) {
			qs = qs.concat(this.buildQSValues('lte', this.lte, true));
		}

		if (this.gt) {
			qs = qs.concat(this.buildQSValues('gt', this.gt, true));
		}

		if (this.gte) {
			qs = qs.concat(this.buildQSValues('gte', this.gte, true));
		}

		if (this.startsWith) {
			qs = qs.concat(this.buildQSValues('startsWith', this.startsWith, true));
		}

		if (this.endsWith) {
			qs = qs.concat(this.buildQSValues('endsWith', this.endsWith, true));
		}

		if (this.contains) {
			qs = qs.concat(this.buildQSValues('contains', this.contains, true));
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
