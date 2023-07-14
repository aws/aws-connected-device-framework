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

import { SearchRequestModel } from '@awssolutions/cdf-assetlibrary-client';

export interface NewDeployment {
    coreName: string;
}

export interface Deployment extends NewDeployment {
    taskStatus?: DeploymentTaskStatus;
    statusMessage?: string;
    deploymentStatus?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface DeploymentList {
    deployments: Deployment[];
    pagination?: {
        lastEvaluated?: {
            key: string;
        };
        count?: number;
    };
}
export interface NewDeploymentTask {
    template: {
        name: string;
        version?: number;
    };
    targets: {
        thingNames?: string[];
        thingGroupNames?: string[];
        assetLibraryDeviceIds?: string[];
        assetLibraryGroupPaths?: string[];
        assetLibraryQuery?: SearchRequestModel;
    };
    iotJobConfig?: {
        jobExecutionRolloutConfig?: {
            maximumPerMinute: number;
            exponentialRate?: {
                baseRatePerMinute: number;
                incrementFactor: number;
                rateIncreaseCriteria: {
                    numberOfNotifiedTargets: number;
                    numberOfSucceededTargets: number;
                };
            };
        };
        abortConfig?: {
            criteriaList: [
                {
                    failureType: string;
                    action: string;
                    thresholdPercentage: number;
                    minnumberOfExecutedThings: number;
                }
            ];
        };
        timeoutConfig?: {
            inProgressTimeoutInMinutes: number;
        };
    };
}

export interface DeploymentTask extends NewDeploymentTask {
    id: string;
    taskStatus: DeploymentTaskStatus;
    statusMessage?: string;
    createdAt: Date;
    updatedAt?: Date;

    deployments?: Deployment[];

    // no. of batches the task has been split into
    batchesTotal?: number;
    // no. of batches reporting as complete, regardless of whether success or not
    batchesComplete?: number;
}

export type DeploymentTaskStatus = 'Waiting' | 'InProgress' | 'Success' | 'Failure';
