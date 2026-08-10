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

export interface EventModel {
    objectId: string;
    type: Category;
    time: string;
    event: EventType;
    user: string;
    payload: string;
    attributes: { [key: string]: string };
}

export interface KinesisRecord {
    kinesis: {
        kinesisSchemaVersion: string;
        partitionKey: string;
        sequenceNumber: string;
        data: string;
        approimateArrivalTimestamp: number;
    };
    eventSource: string;
    eventVersion: string;
    eventID: string;
    eventName: string;
    invokeIdentityArn: string;
    awsRegion: string;
    eventSourceARN: string;
}

export interface KinesisRecords {
    Records: KinesisRecord[];
}

export interface StateHistoryModel {
    objectId: string;
    type: Category;
    time: string;
    event: EventType;
    user: string;
    state: string;
}

export interface StateHistoryListModel {
    events: StateHistoryModel[];
    pagination?: {
        token: string;
        limit: number;
    };
}

export enum Category {
    devices = 'devices',
    groups = 'groups',
    deviceTemplates = 'deviceTemplates',
    groupTemplates = 'groupTemplates',
    policies = 'policies',
}

export enum EventType {
    create = 'create',
    modify = 'modify',
    delete = 'delete',
}
