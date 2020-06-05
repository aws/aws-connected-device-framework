import { RegisterThingResponse } from 'aws-sdk/clients/iot';

/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface ProvisionThingRequest {
	provisioningTemplateId:string;
	parameters: {[key:string]:string};
	cdfProvisioningParameters?: CdfProvisioningParameters;
}

export interface CdfProvisioningParameters {
	caId?: string;
	certInfo?: {
		commonName?: string;
		organization?: string;
		organizationalUnit?: string;
		locality?: string;
		stateName?: string;
		country?: string;
		emailAddress?: string;
	};
	certificatePem?: string;
	certificateStatus?: CertificateStatus;
	privateKey?: string;
	registered?:RegisterThingResponse;
}

export interface ProvisionThingResponse {
	certificatePem:string;
	publicKey?:string;
	privateKey?:string;
	resourceArns?: {
		policyLogicalName?:string;
		certificate?:string;
		thing?:string;
	};
}

export interface BulkProvisionThingsRequest {
	provisioningTemplateId:string;
	parameters: {[key:string]:string}[];
	cdfProvisioningParameters?: CdfProvisioningParameters;
}
export interface BulkProvisionThingsResponse {
	taskId:string;
	creationDate?:Date;
	lastModifiedDate?:Date;
	status?:string;
	successCount?:number;
	failureCount?:number;
	percentageProgress?:number;

}

export interface ThingDetailModel {
	thingName:string;
	arn:string;
	thingType?:string;
	attributes?:{ [key: string] : string};
	certificates?: ThingCertificateModel[];
	policies?: ThingPolicyModel[];
	groups?: ThingGroupModel[];
}

export interface ThingCertificateModel {
	certificateId:string;
	arn:string;
	certificateStatus: CertificateStatus;
	certificatePem:string;
}

export enum CertificateStatus {
	ACTIVE = 'ACTIVE',
	INACTIVE = 'INACTIVE',
	REGISTER_INACTIVE = 'REGISTER_INACTIVE',
	PENDING_TRANSFER = 'PENDING_TRANSFER',
	PENDING_ACTIVATION = 'PENDING_ACTIVATION',
	REVOKED = 'REVOKED'
}

export interface PatchCertificateRequest {
	certificateStatus: CertificateStatus;
}

export interface ThingPolicyModel {
	policyName:string;
	arn:string;
	policyDocument:string;
}

export interface ThingGroupModel {
	groupName:string;
	arn:string;
	attributes?:{ [key: string] : string};
}
