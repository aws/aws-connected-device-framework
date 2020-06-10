/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 */

export interface ProvisionThingRequest {
    provisioningTemplateId:string;
	parameters: {[key:string]:string};
	cdfProvisioningParameters?: CdfProvisioningParameters;
}

export interface CdfProvisioningParameters {
	caId?: string;
	certificatePem?: string;
	certificateStatus?: string;
	certInfo?: {
		commonName?: string;
		organization?: string;
		organizationalUnit?: string;
		locality?: string;
		stateName?: string;
		country?: string;
		emailAddress?: string;
	};
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

export interface Thing {
    thingName: string;
    arn: string;
    thingType: string;
    attributes: {[key:string]:string};
	certificates?: ThingCertificate[];
	policies?: ThingPolicy[];
	groups?: ThingGroup[];
}

export interface ThingCertificate {
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

export interface ThingPolicy {
	policyName:string;
	arn:string;
	policyDocument:string;
}

export interface ThingGroup {
	groupName:string;
	arn:string;
	attributes?:{ [key: string] : string};
}

export interface BulkProvisionThingsRequest {
	provisioningTemplateId:string;
	parameters: {[key:string]:string}[];
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

export interface RequestHeaders {
	[key:string] : string;
}
