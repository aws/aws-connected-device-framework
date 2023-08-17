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
    DocumentClientFactory: Symbol.for('Factory<DocumentClient>'),
};
