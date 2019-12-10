/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

    DDBStreamTransformer: Symbol.for('DDBStreamTransformer'),

    EventSourceService: Symbol.for('EventSourceService'),
    EventSourceDao: Symbol.for('EventSourceDao'),
    EventSourceAssembler: Symbol.for('EventSourceAssembler'),

    DynamoDbEventSource: Symbol.for('DynamoDbEventSource'),
    IotCoreEventSource: Symbol.for('IotCoreEventSource'),

    EventService: Symbol.for('EventService'),
    EventDao: Symbol.for('EventDao'),
    EventAssembler: Symbol.for('EventAssembler'),

    EventConditionsUtils: Symbol.for('EventConditionsUtils'),

    SubscriptionService: Symbol.for('SubscriptionService'),
    SubscriptionDao: Symbol.for('SubscriptionDao'),
    SubscriptionAssembler: Symbol.for('SubscriptionAssembler'),

    TargetService: Symbol.for('TargetService'),
    EmailTarget: Symbol.for('EmailTarget'),
    SMSTarget: Symbol.for('SMSTarget'),
    SNSTarget: Symbol.for('SNSTarget'),
    DynamodDBTarget: Symbol.for('DynamodDBTarget'),

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

    Iot:  Symbol.for('Iot'),
    IotFactory:  Symbol.for('Factory<Iot>')
};
