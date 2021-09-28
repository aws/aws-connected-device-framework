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

    DDBStreamTransformer: Symbol.for('DDBStreamTransformer'),

    EventSourceService: Symbol.for('EventSourceService'),
    EventSourceDao: Symbol.for('EventSourceDao'),
    EventSourceAssembler: Symbol.for('EventSourceAssembler'),

    DynamoDbEventSource: Symbol.for('DynamoDbEventSource'),
    IotCoreEventSource: Symbol.for('IotCoreEventSource'),
    ApiGatewayEventSource: Symbol.for('ApiGatewayEventSource'),

    ApigwTriggerService: Symbol.for('ApigwTriggerService'),

    EventService: Symbol.for('EventService'),
    EventDao: Symbol.for('EventDao'),
    EventAssembler: Symbol.for('EventAssembler'),

    EventConditionsUtils: Symbol.for('EventConditionsUtils'),

    SubscriptionService: Symbol.for('SubscriptionService'),
    SubscriptionDao: Symbol.for('SubscriptionDao'),
    SubscriptionAssembler: Symbol.for('SubscriptionAssembler'),

    TargetService: Symbol.for('TargetService'),
    TargetDao: Symbol.for('TargetDao'),
    TargetAssembler: Symbol.for('TargetAssembler'),

    EmailTarget: Symbol.for('EmailTarget'),
    SMSTarget: Symbol.for('SMSTarget'),
    SNSTarget: Symbol.for('SNSTarget'),
    DynamodDBTarget: Symbol.for('DynamodDBTarget'),
    PushTarget: Symbol.for('PushTarget'),
    FilterService: Symbol.for('FilterService'),

    AlertDao: Symbol.for('AlertDao'),

    Controller: Symbol.for('Controller'),

    DynamoDbUtils: Symbol.for('DynamoDbUtils'),

    DocumentClient:  Symbol.for('DocumentClient'),
    DocumentClientFactory:  Symbol.for('Factory<DocumentClient>'),

    CachableDocumentClient:  Symbol.for('CachableDocumentClient'),
    CachableDocumentClientFactory:  Symbol.for('Factory<CachableDocumentClient>'),

    DynamoDB:  Symbol.for('DynamoDB'),
    DynamoDBFactory:  Symbol.for('Factory<DynamoDB>'),

    Lambda:  Symbol.for('Lambda'),
    LambdaFactory:  Symbol.for('Factory<Lambda>'),

    SNS:  Symbol.for('SNS'),
    SNSFactory:  Symbol.for('Factory<SNS>'),

    IotData: Symbol.for('IotData'),
    IotDataFactory: Symbol.for('Factory<IotData>'),

    Iot:  Symbol.for('Iot'),
    IotFactory:  Symbol.for('Factory<Iot>'),

    SQS: Symbol.for('SQS'),
    SQSFactory: Symbol.for('Factory<SQS>')
};
