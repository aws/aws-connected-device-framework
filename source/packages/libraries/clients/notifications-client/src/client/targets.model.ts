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

export enum TargetType {
    'email',
    'sms',
    'mqtt',
    'dynamodb',
    'push_gcm',
    'push_adm',
    'push_apns',
}
export type TargetTypeStrings = keyof typeof TargetType;

export type TargetResource =
    | EmailTargetResource
    | SMSTargetResource
    | PushTargetResource
    | MQTTTargetResource
    | DynamodDBTargetResource;

export interface EmailTargetResource {
    address: string;
    subscriptionArn?: string;
}

export interface SMSTargetResource {
    phoneNumber: string;
    subscriptionArn?: string;
}

export interface MQTTTargetResource {
    topic: string;
}

export type AttributeMapping = { [key: string]: string };

export interface DynamodDBTargetResource {
    tableName: string;
    attributeMapping: AttributeMapping;
}

export interface PushTargetResource {
    platformApplicationArn: string;
    token: string;
    subscriptionArn?: string;
    platformEndpointArn?: string;
}
