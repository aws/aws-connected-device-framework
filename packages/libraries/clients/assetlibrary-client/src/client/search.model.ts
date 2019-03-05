/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Group } from './groups.model';
import { Device } from './devices.model';

export class SearchRequestModel {
	types: string[]=[];
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

 	summarize: boolean = false;

	public toQueryString():string {
		const qs:string[]= [];

		if (this.types) {
			this.types.forEach(k=> qs.push(`type=${k}`));
		}

		if (this.ancestorPath) {
			qs.push(`ancestorPath=${this.ancestorPath}`);
		}

		if (this.eq) {
			Object.keys(this.eq).forEach(k=> qs.push(`eq=${k}:${this.eq[k]}`));
		}

		if (this.neq) {
			Object.keys(this.neq).forEach(k=> qs.push(`neq=${k}:${this.neq[k]}`));
		}

		if (this.lt) {
			Object.keys(this.lt).forEach(k=> qs.push(`lt=${k}:${this.lt[k]}`));
		}

		if (this.lte) {
			Object.keys(this.lte).forEach(k=> qs.push(`lte=${k}:${this.lte[k]}`));
		}

		if (this.gt) {
			Object.keys(this.gt).forEach(k=> qs.push(`gt=${k}:${this.gt[k]}`));
		}

		if (this.gte) {
			Object.keys(this.gte).forEach(k=> qs.push(`gte=${k}:${this.gte[k]}`));
		}

		if (this.startsWith) {
			Object.keys(this.startsWith).forEach(k=> qs.push(`startsWith=${k}:${this.startsWith[k]}`));
		}

		if (this.endsWith) {
			Object.keys(this.endsWith).forEach(k=> qs.push(`endsWith=${k}:${this.endsWith[k]}`));
		}

		if (this.contains) {
			Object.keys(this.contains).forEach(k=> qs.push(`contains=${k}:${this.contains[k]}`));
		}

		qs.push(`summarize=${this.summarize}`);

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
