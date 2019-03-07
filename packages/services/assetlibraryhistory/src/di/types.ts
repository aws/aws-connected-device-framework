/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

    EventsDao: Symbol.for('EventsDao'),
    EventsService: Symbol.for('EventsService'),

    QueryService: Symbol.for('QueryService'),

    EventActionFactory: Symbol.for('EventActionFactory'),
    CreateEventAction: Symbol.for('CreateEventAction'),
    UpdateEventAction: Symbol.for('UpdateEventAction'),
    UpdateComponentParentEventAction: Symbol.for('UpdateComponentParentEventAction'),
    DeleteEventAction: Symbol.for('DeleteEventAction'),
    PublishTemplateEventAction: Symbol.for('PublishTemplateEventAction'),
    UnsupportedEventAction: Symbol.for('UnsupportedEventAction'),

    Controller: Symbol.for('Controller'),

    HttpHeaderUtils: Symbol.for('HttpHeaderUtils'),

    DocumentClient: Symbol.for('DocumentClient'),
    DocumentClientFactory: Symbol.for('Factory<DocumentClient>')
};
