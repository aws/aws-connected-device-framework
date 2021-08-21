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

/**
 * The symbols representing each of the classes. Use these to identify which object is to be injected into another.
 */
export const DEVICE_SIMULATOR_TYPES = {

    DeviceStateMachine: Symbol.for('DeviceStateMachine'),

    CalcEngine: Symbol.for('CalcEngine'),
    DeviceEmitter: Symbol.for('DeviceEmitter'),
    AwsIotEmitter: Symbol.for('AwsIotEmitter'),
    AwsIotClient: Symbol.for('awsIotClient'),
    AwsIotMqttClient: Symbol.for('AwsIotMqttClient'),

    LocalStateManager: Symbol.for('LocalStateManager'),

    TelemetryTransformer: Symbol.for('TelemetryTransformer'),

    IotData: Symbol.for('IotData'),
    IotDataFactory: Symbol.for('Factory<IotData>'),
};
