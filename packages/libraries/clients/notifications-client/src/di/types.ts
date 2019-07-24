/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const NOTIFICATIONS_CLIENT_TYPES = {

    NotificationsService: Symbol.for('NotificationsClient_NotificationsService'),

    RestClient: Symbol.for('NotificationsClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<Notifications_RestClient>')
};
