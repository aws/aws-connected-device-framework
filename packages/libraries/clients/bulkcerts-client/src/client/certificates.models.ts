/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export enum CommonNameGenerator {
    Sequential = 'sequential',
    List = 'list',
    Static = 'static'
}
export interface CertificateChunkRequest {
	taskId:string;
	chunkId:number;
	certInfo: CertificateInfo;
	quantity:number;
	caAlias:string;
}

export interface CertificateChunkResponse {
	quantity: number;
	location: string;
}

export interface CertificateInfo {
	commonName?:CommonName|string;
	organization?:string;
	organizationalUnit?:string;
	locality?:string;
	stateName?:string;
	country?:string;
	emailAddress?:string;
	distinguishedNameQualifier?:string;

}

export interface CommonName {
	generator?:CommonNameGenerator;
	prefix?:string;
	commonNameStart?:string;
	commonNameList?:string[];
	commonNameStatic?:string;
}

export interface RequestHeaders {
	[key:string] : string;
}

export interface CertificateBatchTaskWithChunks extends CertificateBatchTaskWithDate {
	chunksPending: number;
	chunksTotal: number;
}
export interface CertificateBatchTask {
	taskId:string;
	status:TaskStatus;
}
export interface CertificateBatchTaskWithDate extends CertificateBatchTask {
	batchDate:number;
}

 export enum TaskStatus {
	  PENDING = 'pending',
	  IN_PROGRESS = 'in_progress',
	  COMPLETE = 'complete'
  }