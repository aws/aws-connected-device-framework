/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface EventSourceSummaryResource {
    eventSourceId: string;
}

export interface EventSourceDetailResource extends EventSourceSummaryResource {
    principal: string;
    sourceType: EventSourceType;
    enabled: boolean;

    // DDBStreamEventSource only...
    tableName?: string;
}

export enum EventSourceType {
    ApiGateway = 'ApiGateway',
    DynamoDBStream = 'DynamoDBStream',
    IoTCore = 'IoTCore'
}

export class EventSourceResourceList {
    results: EventSourceSummaryResource[]=[];
    pagination?: {
        offset:number;
        count:number;
    };
}

export interface EventSourceItem {
    // common...
    pk: string;
    sk: string;
    sourceType?: EventSourceType;
    principal?: string;
    enabled?: boolean;

    // ddbstream specific...
    tableName?: string;
}
