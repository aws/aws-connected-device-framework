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
export const ASSETLIBRARY_CLIENT_TYPES = {

    DevicesService: Symbol.for('AssetLibraryClient_DevicesService'),
    GroupsService: Symbol.for('AssetLibraryClient_GroupsService'),
    PoliciesService: Symbol.for('AssetLibraryClient_PoliciesService'),
    TemplatesService: Symbol.for('AssetLibraryClient_TemplatesService'),
    SearchService: Symbol.for('AssetLibraryClient_SearchService'),
    ProfilesService: Symbol.for('AssetLibraryClient_ProfilesService'),

    RestClient: Symbol.for('AssetLibraryClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<AssetLibraryClient_RestClient>')

};

// This type will be deprecated. Left here to avoid breaking change for legacy users.
export const ASSTLIBRARY_CLIENT_TYPES = ASSETLIBRARY_CLIENT_TYPES;
