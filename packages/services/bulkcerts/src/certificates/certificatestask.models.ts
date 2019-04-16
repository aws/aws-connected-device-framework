/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface CertificateBatchRequest {
  quantity:number;
  register?:boolean;
}

export interface CertificateBatchTask {
	taskId:string;
	status:TaskStatus;
}
export interface CertificateBatchTaskWithDate extends CertificateBatchTask {
	batchDate:number;
}

export interface CertificateBatchTaskWithChunks extends CertificateBatchTaskWithDate {
	chunksPending: number;
	chunksTotal: number;
}

export enum TaskStatus {
	PENDING = 'pending',
	IN_PROGRESS = 'in_progress',
	COMPLETE = 'complete'
}

export interface CertificateBatchTaskStatusList {
	tasks:CertificateBatchTaskWithDate[];
}

export interface CertificateBatchChunkCompleteRequest {
	taskId:string;
	chunkId:number;
	quantity:number;
	location:string;
}
