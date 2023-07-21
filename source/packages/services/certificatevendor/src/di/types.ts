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
    CertificateService: Symbol.for('CertificateService'),

    RegistryManager: Symbol.for('RegistryManager'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),

    IotData: Symbol.for('IotData'),
    IotDataFactory: Symbol.for('Factory<IotData>'),

    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),

    SSM: Symbol.for('SSM'),
    SSMFactory: Symbol.for('Factory<SSM>'),
};
