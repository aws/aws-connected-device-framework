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
export const TYPES = {
    Controller: Symbol.for('Controller'),

    CommandsDao: Symbol.for('CommandsDao'),
    CommandsService: Symbol.for('CommandsService'),
    CommandsValidator: Symbol.for('CommandsValidator'),
    CommandsAssembler: Symbol.for('CommandsAssembler'),

    MessagesDao: Symbol.for('MessagesDao'),
    MessagesService: Symbol.for('MessagesService'),
    MessagesAssembler: Symbol.for('MessagesAssembler'),

    ResponsesDao: Symbol.for('ResponsesDao'),
    ResponsesService: Symbol.for('ResponsesService'),

    AwsIotThingListBuilder: Symbol.for('AwsIotThingListBuilder'),

    DynamoDbUtils: Symbol.for('DynamoDbUtils'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),

    IotData: Symbol.for('IotData'),
    IotDataFactory: Symbol.for('Factory<IotData>'),

    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),

    DocumentClient: Symbol.for('DocumentClient'),
    DocumentClientFactory: Symbol.for('Factory<DocumentClient>'),

    SQS: Symbol.for('SQS'),
    SQSFactory: Symbol.for('Factory<SQS>'),

    WorkflowFactory: Symbol.for('WorkflowFactory'),
    UseTargetsAction: Symbol.for('UseTargetsAction'),
    ResolveTargetsAction: Symbol.for('ResolveTargetsAction'),
    InvalidTransitionAction: Symbol.for('InvalidTransitionAction'),
    BatchTargetsAction: Symbol.for('BatchTargetsAction'),
    TopicAction: Symbol.for('TopicAction'),
    ShadowAction: Symbol.for('ShadowAction'),
    JobAction: Symbol.for('JobAction'),
};
