/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface PresignedUploadRequestModel {
	thingName:string;
	commandId:string;
	requestedObjectKeys:string[];
}

export interface PresignedDownloadRequestModel {
	thingName:string;
	commandId:string;
	requestedFileAliases:string[];
}

export interface PresignedResponseModel {
	thingName:string;
	commandId:string;
	status:PresignedResponseStatusType;
	presignedUrls?: { [key: string] : string};
}

export enum PresignedResponseStatusType {
	SUCCESS = 'SUCCESS',
	FAILED = 'FAILED'
}
