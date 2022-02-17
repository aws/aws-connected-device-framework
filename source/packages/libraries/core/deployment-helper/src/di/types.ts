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
    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),

    EC2: Symbol.for('EC2'),
    EC2Factory: Symbol.for('Factory<EC2>'),

    CustomResourceManager: Symbol.for('CustomResourceManager'),
    AppConfigOverrideCustomResource: Symbol.for('AppConfigOverrideCustomResource'),

    AssetLibraryInitCustomResource: Symbol.for('AssetLibraryInitCustomResource'),
    AssetLibraryBulkGroupsCustomResource: Symbol.for('AssetLibraryBulkGroupsCustomResource'),
    AssetLibraryPolicyCustomResource: Symbol.for('AssetLibraryPolicyCustomResource'),
    AssetLibraryTemplateCustomResource: Symbol.for('AssetLibraryTemplateCustomResource'),
    

    CommandsTemplateCustomResource: Symbol.for('CommandsTemplateCustomResource'),
    CommandsCommandCustomResource: Symbol.for('CommandsCommandCustomResource'),

    IotEndpointCustomResource: Symbol.for('IotEndpointCustomResource'),
    IotEventsCustomResource: Symbol.for('IotEventsCustomResource'),
    IotFleetIndexCustomResource: Symbol.for('IotFleetIndexCustomResource'),
    IotPoliciesCustomResource: Symbol.for('IotPoliciesCustomResource'),
    IotRoleAliasCustomResource: Symbol.for('IotRoleAliasCustomResource'),
    IotThingGroupCustomResource: Symbol.for('IotThingGroupCustomResource'),
    IotThingTypeCustomResource: Symbol.for('IotThingTypeCustomResource'),

    RotateCertificatesJobCustomResource: Symbol.for('RotateCertificatesJobCustomResource'),

    NeptuneEngineCustomResource: Symbol.for('NeptuneEngineVersionCustomResource'),

    VpcEndpointCheckCustomResource: Symbol.for('VpcEndpointCheckCustomResource'),
    VpcEndpointCustomResource: Symbol.for('VpcEndpointCustomResource'),

    S3PutObjectCustomResource: Symbol.for('S3PutObjectCustomResource'),
    IotDeviceDefenderCustomResource: Symbol.for('IotDeviceDefenderCustomResource'),
    
    EventSourceCustomResource: Symbol.for('EventSourceCustomResource'),
    EventsCustomResource: Symbol.for('EventsCustomResource')
};
