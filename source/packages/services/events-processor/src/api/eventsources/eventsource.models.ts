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
