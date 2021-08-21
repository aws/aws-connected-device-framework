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
export interface NotificationEvent {
    accountId: string;
    taskId: string;
    taskStatus: string;
    taskType: string;
    failedChecksCount: number;
    canceledChecksCount: number;
    nonCompliantChecksCount: number;
    compliantChecksCount: number;
    totalChecksCount: number;
    taskStartTime: number;
    auditDetails?: (AuditDetail)[] | null;
}
export interface AuditDetail {
    checkName: string;
    checkRunStatus: string;
    nonCompliantResourcesCount: number;
    totalResourcesCount: number;
}

export interface SqsRequestList {
    batchType: BatchType;
    sqsRequests: SqsRequest[];
}
export interface SqsRequest {
    thingName:string;
    certificateArn:string;
}

export interface CertificateList {
    batchType: BatchType;
    certRequests:CertRequest[];
}
export interface CertRequest {
    certificateArn:string;
}

export interface AuditNextPageRequest {
    checkName: string;
    nextToken: string;
    taskId: string;
    maxResults: number;
    batchType: BatchType;
}

export interface DeviceNextPageRequest {
    principal: string;
    nextToken: string;
    maxResults: number;
    batchType: BatchType;
}

export enum BatchType {
    NEXTAUDITPAGE = 'NEXTAUDITPAGE',
    EXPIRINGCERTIFICATE = 'EXPIRINGCERTIFICATE',
    READYPROCESSING = 'READYPROCESSING',
    NEXTDEVICEPAGE = 'NEXTDEVICEPAGE'
}
