/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export enum TargetType {'email', 'sms', 'mqtt', 'dynamodb', 'push_gcm', 'push_adm', 'push_apns'}
export type TargetTypeStrings = keyof typeof TargetType;

export type TargetResource =
    EmailTargetResource |
    SMSTargetResource |
    PushTargetResource |
    MQTTTargetResource |
    DynamodDBTargetResource;

export interface EmailTargetResource {
    address:string;
    subscriptionArn?:string;
}

export interface SMSTargetResource {
    phoneNumber:string;
    subscriptionArn?:string;
}

export interface MQTTTargetResource {
    topic:string;
}

export type AttributeMapping = { [key: string] : string};

export interface DynamodDBTargetResource {
    tableName:string;
    attributeMapping: AttributeMapping;
}

export interface PushTargetResource {
    platformApplicationArn:string;
    token:string;
    subscriptionArn?:string;
    platformEndpointArn? : string;
}
