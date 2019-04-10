/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

    DDBStreamTransformer: Symbol.for('DDBStreamTransformer'),

    EventSourceService: Symbol.for('EventSourceService'),
    EventSourceDao: Symbol.for('EventSourceDao'),
    EventSourceAssembler: Symbol.for('EventSourceAssembler'),

    EventService: Symbol.for('EventService'),
    EventDao: Symbol.for('EventDao'),
    EventAssembler: Symbol.for('EventAssembler'),

    SubscriptionService: Symbol.for('SubscriptionService'),
    SubscriptionDao: Symbol.for('SubscriptionDao'),
    SubscriptionAssembler: Symbol.for('SubscriptionAssembler'),

    FilterService: Symbol.for('FilterService'),
    FilterDao: Symbol.for('FilterDao'),

    Controller: Symbol.for('Controller'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),

    DocumentClient:  Symbol.for('DocumentClient'),
    DocumentClientFactory:  Symbol.for('Factory<DocumentClient>'),

    DynamoDB:  Symbol.for('DynamoDB'),
    DynamoDBFactory:  Symbol.for('Factory<DynamoDB>')
};
