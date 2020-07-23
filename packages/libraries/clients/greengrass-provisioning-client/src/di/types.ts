/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const GREENGRASS_PROVISIONING_CLIENT_TYPES = {

    DeploymentsService: Symbol.for('GreengrassProvisioningClient_DeploymentsService'),
    DevicesService: Symbol.for('GreengrassProvisioningClient_DevicesService'),
    GroupsService: Symbol.for('GreengrassProvisioningClient_GroupsService'),
    SubscriptionsService: Symbol.for('GreengrassProvisioningClient_SubscriptionsService'),
    TemplatesService: Symbol.for('GreengrassProvisioningClient_TemplatesService'),

    RestClient: Symbol.for('GreengrassProvisioningClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<GreengrassProvisioningClient_RestClient>')

};
