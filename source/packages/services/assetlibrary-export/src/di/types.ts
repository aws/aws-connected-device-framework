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

    GroupsService: Symbol.for('GroupsService'),
    GroupsDao: Symbol.for('GroupsDao'),
    GroupsAssembler: Symbol.for('GroupsAssembler'),

    DevicesService: Symbol.for('DevicesService'),
    DevicesDao: Symbol.for('DevicesDao'),
    DevicesAssembler: Symbol.for('DevicesAssembler'),

    CommonDao: Symbol.for('CommonDao'),

    FullAssembler: Symbol.for('FullAssembler'),

    NodeAssembler: Symbol.for('NodeAssembler'),

    TypeUtils: Symbol.for('TypeUtils'),

    GraphSource: Symbol.for('GraphSource'),
    GraphSourceFactory: Symbol.for('Factory<GraphSource>'),

    BatchService: Symbol.for('BatchService'),
    CategoryBatcher: Symbol.for('CategoryBatcher'),
    TypeBatcher: Symbol.for('TypeBatcher'),
    LabelsDao: Symbol.for('LabelsDao'),
    LabelsService: Symbol.for('LabelsService'),

    ETLService: Symbol.for('ETLService'),
    ExtractService: Symbol.for('ExtractService'),
    TransformService: Symbol.for('TransformService'),
    LoadService: Symbol.for('LoadService'),

    DeviceExtractor: Symbol.for('DeviceExtractor'),
    GroupExtractor: Symbol.for('GroupExtractor'),

    S3Loader: Symbol.for('S3Loader'),

    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),
    S3Utils: Symbol.for('S3Utils'),
};
