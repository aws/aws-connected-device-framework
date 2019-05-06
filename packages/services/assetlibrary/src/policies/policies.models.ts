/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export class PolicyModel {
	policyId: string;
	type: string;
	description: string;
	appliesTo:string[]=[];
	document:string;

}

export interface PolicyListModel {
    results: PolicyModel[];
	pagination?: {
		offset:number;
		count: number;
	};
}

export class Policy {
    policy: {
        id: string;
        type: string;
        policyId: string[];
        description: string[];
        document: string[];
    };
    groups: {
        id:string;
        label:string;
    }[];
}
export class AttachedPolicy extends Policy {
    policyGroups: {
        id:string;
        label:string
    }[];
}
