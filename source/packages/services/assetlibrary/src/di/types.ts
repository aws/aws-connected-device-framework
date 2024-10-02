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
    TypesService: Symbol.for('TypesService'),
    TypesDao: Symbol.for('TypesDao'),

    SchemaValidatorService: Symbol.for('SchemaValidatorService'),

    GroupsService: Symbol.for('GroupsService'),
    GroupsDao: Symbol.for('GroupsDao'),
    GroupsAssembler: Symbol.for('GroupsAssembler'),

    DevicesService: Symbol.for('DevicesService'),
    DevicesDao: Symbol.for('DevicesDao'),
    DevicesAssembler: Symbol.for('DevicesAssembler'),

    CommonDao: Symbol.for('CommonDao'),
    ConnectionDao: Symbol.for('ConnectionDao'),

    FullAssembler: Symbol.for('FullAssembler'),

    SearchService: Symbol.for('SearchService'),
    SearchDao: Symbol.for('SearchDao'),
    SearchAssembler: Symbol.for('SearchAssembler'),

    PoliciesService: Symbol.for('PoliciesService'),
    PoliciesDao: Symbol.for('PoliciesDao'),
    PoliciesAssembler: Symbol.for('PoliciesAssembler'),

    ProfilesService: Symbol.for('ProfilesService'),
    ProfilesDao: Symbol.for('ProfilesDao'),
    ProfilesAssembler: Symbol.for('ProfilesAssembler'),

    AuthzServiceFull: Symbol.for('AuthzServiceFull'),
    AuthzDaoFull: Symbol.for('AuthzDaoFull'),

    NodeAssembler: Symbol.for('NodeAssembler'),

    EventEmitter: Symbol.for('EventEmitter'),

    InitService: Symbol.for('InitService'),
    InitDao: Symbol.for('InitDao'),

    Controller: Symbol.for('Controller'),

    HttpHeaderUtils: Symbol.for('HttpHeaderUtils'),
    TypeUtils: Symbol.for('TypeUtils'),

    GraphSource: Symbol.for('GraphSource'),
    GraphSourceFactory: Symbol.for('Factory<GraphSource>'),

    IotData: Symbol.for('IotData'),
    IotDataFactory: Symbol.for('Factory<IotData>'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),
};
