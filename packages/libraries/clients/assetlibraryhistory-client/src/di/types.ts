/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const ASSETLIBRARYHISTORY_CLIENT_TYPES = {

    EventsService: Symbol.for('AssetLibraryHistoryClient_EventsService'),

    RestClient: Symbol.for('AssetLibraryHistoryClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<AssetLibraryHistoryClient_RestClient>')

};
