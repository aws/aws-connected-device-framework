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
