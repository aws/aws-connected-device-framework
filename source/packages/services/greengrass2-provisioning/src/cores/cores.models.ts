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
export interface NewCoreResource {
    name: string;
    provisioningTemplate: string;
    provisioningParameters?: { [key: string]: string };
    cdfProvisioningParameters?: CdfProvisioningParameters;
    configFileGenerator?: string;
}

export interface CoreResource extends NewCoreResource {
    taskStatus: CoreTaskStatus;
    statusMessage?: string;

    artifacts?: {
        [key: string]: Artifact
    };

    device?: Device;
    template?: Template;

    createdAt: Date;
    updatedAt?: Date;
}

export interface CoreListResource {
    cores: CoreResource[];
    pagination?: {
        lastEvaluated?: {
            thingName: string
        },
        count?: number
    };
}

export interface CoreItem {
    name: string;

    provisioningTemplate: string;
    provisioningParameters?: { [key: string]: string };
    cdfProvisioningParameters?: CdfProvisioningParameters;

    configFileGenerator?: string;

    taskStatus?: CoreTaskStatus;
    statusMessage?: string;

    artifacts?: {
        [key: string]: Artifact
    };

    device?: Device;
    template?: Template;

    createdAt?: Date;
    updatedAt?: Date;
}

export interface FailedCoreDeployment {
    name: string;
    templateName: string;
    templateVersion: number;
    deploymentStatus: string;
    deploymentStatusMessage: string;
}

interface Device {
    coreVersion?: string;
    platform?: string;
    architecture?: string;
    status?: string;
    lastStatusUpdateTimestamp?: Date;
    tags?: { [key: string]: string };
    installedComponents?: InstalledComponent[];
    effectiveDeployments: EffectiveDeployment[];
}

interface Template {
    desired?: {
        name: string;
        version: number;
    };
    reported?: {
        name: string;
        version: number;
        deploymentStatus: string;
        deploymentStatusMessage: string;
        jobStatus: string;
    }
}

export interface Artifact {
    bucket: string;
    key: string;
    createdAt?: Date;
}

export interface InstalledComponent {
    name: string;
    version: string;
}

export interface EffectiveDeployment {
    deploymentId: string;
    deploymentName: string;
    iotJobId?: string;
    iotJobArn?: string;
    description?: string;
    targetArn?: string;
    coreDeviceExecutionStatus?: string;
    reason?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type CoreTaskStatus = 'Waiting' | 'InProgress' | 'Success' | 'Failure';


export type CdfProvisioningParameters = CreateDeviceCertificateParameters | RegisterDeviceCertificateWithoutCAParameters | UseACMPCAParameters | undefined;

export interface CreateDeviceCertificateParameters {
    caId: string;
    certInfo: CertInfo;
}
export interface RegisterDeviceCertificateWithoutCAParameters {
    certificatePem: string;
    certificateStatus?: CertificateStatus;
}

export enum CertificateStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}

export interface UseACMPCAParameters {
    acmpcaCaArn?: string;
    acmpcaCaAlias?: string;

    awsiotCaArn?: string;
    awsiotCaAlias?: string;

    csr?: string;
    certInfo: CertInfo;
}

export interface CertInfo {
    commonName?: string;
    organization?: string;
    organizationalUnit?: string;
    locality?: string;
    stateName?: string;
    country?: string;
    emailAddress?: string;
    daysExpiry?: number;
}

export type InstallerConfigGenerators = { [alias: string]: string };

export type ConfigGeneratorEvent = {
    version: string;
    coreDeviceName: string;
    provisioningTemplate?: string;
    templateParameters?: { [key: string]: string };
    cdfProvisioningParameters?: CdfProvisioningParameters;
}

export const CoreCreatedEvent = 'Core Created Event'

export const CoreDeletedEvent = 'Core Deleted Event'

export const CoreTemplateUpdatedEvent = 'Core Template Updated Event'

export type coreTaskId = string;

export type deploymentTaskId = string;

export type CoreBasePayload = {
    coreName: string;
    taskId: coreTaskId;
    status: 'success' | 'failed'
    message?: string;
}

export type CoreCreatedPayload = CoreBasePayload

export type CoreDeletedPayload = CoreBasePayload

export type CoreTemplateUpdatedPayload = Omit<CoreBasePayload, 'taskId'> &
{
    deploymentId: string,
    deploymentTaskId: deploymentTaskId,
    jobId: string;
    templateName: string,
    templateVersion: number,
}


