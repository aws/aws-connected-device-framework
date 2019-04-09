/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

    EventSourceService: Symbol.for('EventSourceService'),
    EventSourceDao: Symbol.for('EventSourceDao'),
    EventSourceAssembler: Symbol.for('EventSourceAssembler'),

    EventService: Symbol.for('EventService'),
    EventDao: Symbol.for('EventDao'),
    EventAssembler: Symbol.for('EventAssembler'),

    SubscriptionService: Symbol.for('Subscriptionervice'),
    SubscriptionDao: Symbol.for('SubscriptionDao'),
    SubscriptionAssembler: Symbol.for('SubscriptionAssembler'),

    Controller: Symbol.for('Controller'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),

    DocumentClient:  Symbol.for('DocumentClient'),
    DocumentClientFactory:  Symbol.for('Factory<DocumentClient>'),

    DynamoDB:  Symbol.for('DynamoDB'),
    DynamoDBFactory:  Symbol.for('Factory<DynamoDB>')
};
