/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export interface EventSourceSummaryResource {
    id: string;
    name:string;
}

export interface EventSourceDetailResource extends EventSourceSummaryResource {
    principal: string;
    sourceType: EventSourceType;
    enabled: boolean;

    dynamoDb?: DynamoDbConfig;
    iotCore?: IotCoreConfig;

}

export enum EventSourceType {
    ApiGateway = 'ApiGateway',
    DynamoDB = 'DynamoDB',
    IoTCore = 'IoTCore'
}

export class EventSourceResourceList {
    results: EventSourceSummaryResource[]=[];
}

export interface EventSourceItem {
    id: string;
    name:string;
    principal: string;
    sourceType: EventSourceType;
    enabled: boolean;

    dynamoDb?: DynamoDbConfig;
    iotCore?: IotCoreConfig;
}

type DynamoDbConfig = {
    tableName: string;
};
type IotCoreConfig = {
    mqttTopic: string;
    attributes: {[key:string]:string};
};
