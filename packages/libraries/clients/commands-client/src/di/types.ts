/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const COMMANDS_CLIENT_TYPES = {

    CommandsService: Symbol.for('CommandsClient_CommandsService'),
    TemplatesService: Symbol.for('CommandsClient_TemplatesService'),
    RestClient: Symbol.for('CommandsClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<CommandsClient_RestClient>')

};
