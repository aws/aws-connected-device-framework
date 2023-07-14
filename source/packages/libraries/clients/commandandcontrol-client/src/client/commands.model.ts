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

export interface EditableCommandResource {
    operation?: string;
    deliveryMethod: TopicDeliveryMethod | ShadowDeliveryMethod | JobDeliveryMethod;
    payloadTemplate?: string;
    payloadParams?: string[];
    enabled?: boolean;
    tags?: Tags;
}

export interface CommandResource extends EditableCommandResource {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AbstractDeliveryMethod {
    type: DeliveryMethod;
    expectReply: boolean;
}

export interface TopicDeliveryMethod extends AbstractDeliveryMethod {
    type: 'TOPIC';
    onlineOnly: boolean;
}

export interface ShadowDeliveryMethod extends AbstractDeliveryMethod {
    type: 'SHADOW';
}

export interface JobDeliveryMethod extends AbstractDeliveryMethod {
    type: 'JOB';
    targetSelection: 'SNAPSHOT' | 'CONTINUOUS';
    presignedUrlConfig?: {
        expiresInSec?: number;
    };
    jobExecutionsRolloutConfig?: {
        maximumPerMinute?: number;
        exponentialRate?: {
            baseRatePerMinute: number;
            incrementFactor: number;
            rateIncreaseCriteria: {
                numberOfNotifiedThings?: number;
                numberOfSucceededThings?: number;
            };
        };
    };
    abortConfig?: {
        criteriaList: {
            failureType: string;
            action: string;
            thresholdPercentage: number;
            minNumberOfExecutedThings: number;
        }[];
    };
    timeoutConfig?: {
        inProgressTimeoutInMinutes: number;
    };
}

export type DeliveryMethod = 'JOB' | 'TOPIC' | 'SHADOW';

export interface CommandResourceList {
    commands: CommandResource[];
    pagination?: {
        lastEvaluated?: {
            commandId: string;
        };
        count?: number;
    };
}

export type Tags = { [key: string]: Tag };
export type Tag = string;
