/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const NOTIFICATIONS_CLIENT_TYPES = {

    EventsService: Symbol.for('NotificationsClient_EventsService'),
    EventSourcesService: Symbol.for('NotificationsClient_EventSourcesService'),
    SubscriptionsService: Symbol.for('NotificationsClient_SubscriptionsService'),

    RestClient: Symbol.for('NotificationsClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<Notifications_RestClient>')
};
