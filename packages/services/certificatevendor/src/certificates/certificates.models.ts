/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface CertificateRequestModel {
	action: Action;
}

export interface CertificateResponseModel {
	location?: string;
	message?: string;
}

export enum Action {
	get = 'get',
	ack = 'ack'
}
