/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const ASSTLIBRARY_CLIENT_TYPES = {

    DevicesService: Symbol.for('AssetLibraryClient_DevicesService'),
    GroupsService: Symbol.for('AssetLibraryClient_GroupsService'),
    PoliciesService: Symbol.for('AssetLibraryClient_PoliciesService'),
    TemplatesService: Symbol.for('AssetLibraryClient_TemplatesService'),
    SearchService: Symbol.for('AssetLibraryClient_SearchService'),
    ProfilesService: Symbol.for('AssetLibraryClient_ProfilesService'),

    RestClient: Symbol.for('AssetLibraryClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<AssetLibraryClient_RestClient>')

};
