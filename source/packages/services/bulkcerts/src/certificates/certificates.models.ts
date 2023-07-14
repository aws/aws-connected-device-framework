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
export enum CommonNameGenerator {
    increment = 'increment',
    list = 'list',
    static = 'static',
}

export interface CertificateChunkRequest {
    taskId: string;
    chunkId: number;
    certInfo: CertificateInfo;
    quantity: number;
    caAlias: string;
}

export interface CertificateChunkResponse {
    quantity: number;
    location: string;
}

export interface CertificateInfo {
    commonName?: CommonName | string;
    commonNameList?: string[];
    organization?: string;
    organizationalUnit?: string;
    locality?: string;
    stateName?: string;
    country?: string;
    emailAddress?: string;
    distinguishedNameQualifier?: string;
    includeCA?: boolean;
    daysExpiry?: number;
}

export interface CommonName {
    generator?: CommonNameGenerator;
    prefix?: string;
    commonNameStart?: string;
    commonNameList?: string[];
    commonNameStatic?: string;
}
export interface ACMCertificateChunkResponse {
    certificates: ACMCertificate[];
}

export interface ACMCertificate {
    certificateArn: string;
    certificate: string;
    privateKey?: string;
}
