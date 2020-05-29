/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const PROVISIONING_CLIENT_TYPES = {

    ThingsService: Symbol.for('ProvisioningClient_ThingsService'),

    RestClient: Symbol.for('ProvisioningClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<ProvisioningClient_RestClient>')

};
