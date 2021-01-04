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

export class EmailTargetResource {
    address:string;
    subscriptionArn?:string;
}

export function determineIfEmailTargetResource(toBeDetermined: unknown): toBeDetermined is EmailTargetResource {
    const as = toBeDetermined as EmailTargetResource;
    return as.address!==undefined;
}

export class SMSTargetResource {
    phoneNumber:string;
    subscriptionArn?:string;
}

export function determineIfSMSTargetResource(toBeDetermined: unknown): toBeDetermined is SMSTargetResource {
    const as = toBeDetermined as SMSTargetResource;
    return as.phoneNumber!==undefined;
}

export class MQTTTargetResource {
    topic:string;
}

export function determineIfMQTTTargetResource(toBeDetermined: unknown): toBeDetermined is MQTTTargetResource {
    const as = toBeDetermined as MQTTTargetResource;
    return as.topic!==undefined;
}

export type AttributeMapping = { [key: string] : string};

export class DynamodDBTargetResource {
    tableName:string;
    attributeMapping: AttributeMapping;
}

export function determineIfDynamodDBTargetResource(toBeDetermined: unknown): toBeDetermined is DynamodDBTargetResource {
    const as = toBeDetermined as DynamodDBTargetResource;
    return as.tableName!==undefined;
}

export class PushTargetResource {
    platformApplicationArn:string;
    token:string;
    subscriptionArn?:string;
    platformEndpointArn? : string;
}

export function determineIfPushTargetResource(toBeDetermined: unknown): toBeDetermined is PushTargetResource {
    const as = toBeDetermined as PushTargetResource;
    return as.platformApplicationArn!==undefined;
}

export type TargetItem =
    EmailTargetItem |
    SMSTargetItem |
    PushTargetItem |
    MQTTTargetItem |
    DynamodDBTargetItem;

export abstract class TargetItemBase {
    targetType: TargetTypeStrings;
    subscriptionId: string;

    abstract getId() : string;
}

export class EmailTargetItem extends TargetItemBase {
    readonly targetType: TargetTypeStrings = 'email';
    address: string;
    subscriptionArn?: string;
    getId(): string {
        return this.address;
    }
}

export class SMSTargetItem extends TargetItemBase {
    readonly targetType: TargetTypeStrings = 'sms';
    phoneNumber: string;
    subscriptionArn?: string;
    getId(): string {
        return this.phoneNumber;
    }
}

export class MQTTTargetItem extends TargetItemBase {
    readonly targetType:TargetTypeStrings = 'mqtt';
    topic:string;
    getId(): string {
        return this.topic;
    }
}

export class DynamodDBTargetItem extends TargetItemBase {
    readonly targetType:TargetTypeStrings = 'dynamodb';
    tableName:string;
    attributeMapping: AttributeMapping;
    getId(): string {
        return this.tableName;
    }

}

export class PushTargetItem extends TargetItemBase {
    platformApplicationArn:string;
    token:string;
    subscriptionArn?:string;
    platformEndpointArn? : string;
    getId(): string {
        return this.platformEndpointArn;
    }
}

export abstract class TargetItemFactory {
    public static getTargetItem(type:TargetTypeStrings) : TargetItem {
        switch (type) {
            case 'dynamodb':
                return new DynamodDBTargetItem();
            case 'email':
                return new EmailTargetItem();
            case 'mqtt':
                return new MQTTTargetItem();
            case 'push_gcm':
            case 'push_adm':
            case 'push_apns': {
                const pti = new PushTargetItem();
                pti.targetType = type;
                return pti;
            }
            case 'sms':
                return new SMSTargetItem();
            default:
                throw new Error('UNSUPPORTED_TARGET_TYPE');
        }
    }
}

export abstract class TargetResourceFactory {
    public static getTargetResource(type:TargetTypeStrings) : TargetResource {
        switch (type) {
            case 'dynamodb':
                return new DynamodDBTargetResource();
            case 'email':
                return new EmailTargetResource();
            case 'mqtt':
                return new MQTTTargetResource();
            case 'push_gcm':
            case 'push_adm':
            case 'push_apns':
                return new PushTargetResource();
            case 'sms':
                return new SMSTargetResource();
            default:
                throw new Error('UNSUPPORTED_TARGET_TYPE');
        }
    }
}
