/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
