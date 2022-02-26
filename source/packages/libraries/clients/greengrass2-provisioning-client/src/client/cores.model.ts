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
 export interface NewCoreTask {
    coreVersion: string;
	cores: NewCore[];
    type: CoreTaskType;
    options?: DeleteCoreTaskOptions;
}

export interface DeleteCoreTaskOptions {
	deprovisionClientDevices: boolean;
	deprovisionCores: boolean;
}

export interface CoreTask {
	id: string;
	cores: Core[];
    options?: DeleteCoreTaskOptions;
	taskStatus: CoreTaskStatus;
	statusMessage?: string;
	createdAt: Date;
	updatedAt?: Date;
    type: CoreTaskType;
    // no. of batches the task has been split into
    batchesTotal?: number;
    // no. of batches reporting as complete, regardless of whether success or not
    batchesComplete?: number;
}

export interface NewCore {
	name: string;

    provisioningTemplate: string;
	provisioningParameters?: {[key : string] : string};
    cdfProvisioningParameters?: CdfProvisioningParameters;
}

export interface CoreList {
    cores: Core[];
    pagination?: {
        lastEvaluated?: {
            thingName: string
        },
        count?: number
    };
}
export interface Core extends NewCore {
	taskStatus: CoreTaskStatus;
	statusMessage?: string;
	createdAt: Date;
	updatedAt?: Date;
    
    artifacts?:  {
        [key : string] : Artifact
    };
    
    device?: {
        coreVersion?: string;
        platform?: string;
        architecture?: string;
        status?: string;
        lastStatusUpdateTimestamp?: Date;
        tags?: {[key : string] : string};
        installedComponents?: InstalledComponent[];
        effectiveDeployments: EffectiveDeployment[];
    };

    template?: {
        desired?: {
            name: string;
            version: number;
        };
        reported?: {
            name: string;
            version: number;
            deploymentStatus: StaticRange;
            jobStatus: string;
        }
    }
}

export interface Artifact {
    bucket:string;
    key:string;
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

export type CoreTaskStatus = 'Waiting'|'InProgress'|'Success'|'Failure';

export interface CdfProvisioningParameters {
    caId?: string;
    certInfo?: {
        commonName?: string;
        organization?: string;
        organizationalUnit?: string;
        locality?: string;
        stateName?: string;
        country?: string;
        emailAddress?: string;
        daysExpiry?:number;
    };
}

export type CoreTaskType = 'Create' | 'Delete'