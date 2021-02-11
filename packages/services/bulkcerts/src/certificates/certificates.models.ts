/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export enum CommonNameGenerator {
    increment = 'increment',
    list = 'list',
    static = 'static'
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
	commonNameList?:string[];
	organization?:string;
	organizationalUnit?:string;
	locality?:string;
	stateName?:string;
	country?:string;
	emailAddress?:string;
	distinguishedNameQualifier?:string;
	includeCA?:boolean;

}

export interface CommonName {
	generator?:CommonNameGenerator;
	prefix?:string;
	commonNameStart?:string;
	commonNameList?:string[];
	commonNameStatic?:string;
}
