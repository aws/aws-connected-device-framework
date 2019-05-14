/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 */

export interface MessagePayloadDefinition {
    /**
     * Name of time stamp attribute in message payload
     */
    timeStampAttributeName?: string;
    /**
     * Map of defined message payload properties, where the key represents the attribtue name, and the value reprents the attribute display name and type.
     */
    properties?: { [key: string]: MessagePayloadDefinitionProperties; };
    /**
     * List of required properties
     */
    required?: string[];
    /**
     * No. seconds that a telemtry should be broadcast from the device
     */
    periodicFrequency?: number;
}

export interface MessagePayloadDefinitionProperties {
    displayName?: string;
    type?: TypeEnum;
}

// tslint:disable-next-line:no-namespace
export enum TypeEnum {
    string = 'string',
    number = 'number',
    binary = 'binary',
    boolean = 'boolean',
    datettime = 'datettime'
}
