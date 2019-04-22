/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
	commonName?:string;
	organization?:string;
	organizationalUnit?:string;
	locality?:string;
	stateName?:string;
	country?:string;
	emailAddress?:string;
	distinguishedNameQualifier?:string;
	serialNumber?:string;
	id?:string;
}
