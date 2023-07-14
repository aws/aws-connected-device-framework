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

import '@awssolutions/cdf-config-inject';
import 'reflect-metadata';

import { EventEmitter } from 'events';
import { ContainerModule, decorate, injectable, interfaces } from 'inversify';
import ow from 'ow';

import { CalcEngine } from '../calculations/calc.engine';
import { DeviceContext } from '../deviceStateMachine/device.context';
import { AwsIotThing } from '../iot/awsIotThing';
import { LocalStateManager } from '../localState/localState.manager';
import { TelemetryTransformer } from '../templates/telemetry.transformer';
import { DEVICE_SIMULATOR_TYPES } from './types';

import awsIot = require('aws-iot-device-sdk');

class D {}
class S {}
class T {}
class U {}

/**
 * A container module that configures inversify with all the objects to be created at runtime
 * that exists within the device simulator base library.
 */
export const deviceSimulatorContainerModule = new ContainerModule(
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        _rebind: interfaces.Rebind,
    ) => {
        bind<DeviceContext<D, S, T, U>>(DEVICE_SIMULATOR_TYPES.DeviceStateMachine)
            .to(DeviceContext)
            .inSingletonScope();
        bind<CalcEngine<D>>(DEVICE_SIMULATOR_TYPES.CalcEngine).to(CalcEngine).inSingletonScope();
        bind<AwsIotThing<S, T, U>>(DEVICE_SIMULATOR_TYPES.AwsIotClient)
            .to(AwsIotThing)
            .inSingletonScope();

        decorate(injectable(), EventEmitter);
        bind<EventEmitter>(DEVICE_SIMULATOR_TYPES.DeviceEmitter)
            .toDynamicValue(() => {
                return new EventEmitter();
            })
            .inSingletonScope();

        bind<EventEmitter>(DEVICE_SIMULATOR_TYPES.AwsIotEmitter)
            .toDynamicValue(() => {
                return new EventEmitter();
            })
            .inSingletonScope();

        bind<LocalStateManager>(DEVICE_SIMULATOR_TYPES.LocalStateManager)
            .to(LocalStateManager)
            .inSingletonScope();
        bind<TelemetryTransformer>(DEVICE_SIMULATOR_TYPES.TelemetryTransformer)
            .to(TelemetryTransformer)
            .inSingletonScope();

        // create the mqtt client
        decorate(injectable(), awsIot.thingShadow);
        bind<awsIot.thingShadow>(DEVICE_SIMULATOR_TYPES.AwsIotMqttClient)
            .toDynamicValue(() => {
                const keyPath = process.env.AWS_IOT_KEYPATH;
                const certPath = process.env.AWS_IOT_CERTPATH;
                const caPath = process.env.AWS_IOT_CAPATH;
                const thingName = process.env.AWS_IOT_THINGNAME;
                const host = process.env.AWS_IOT_ENDPOINTADDRESS;
                const region = process.env.AWS_REGION;

                ow(keyPath, ow.string.nonEmpty);
                ow(certPath, ow.string.nonEmpty);
                ow(caPath, ow.string.nonEmpty);
                ow(thingName, ow.string.nonEmpty);
                ow(host, ow.string.nonEmpty);
                ow(region, ow.string.nonEmpty);

                const mqttClient = new awsIot.thingShadow({
                    keyPath,
                    certPath,
                    caPath,
                    clientId: thingName,
                    host,
                    region,
                    autoResubscribe: true,
                    offlineQueueing: true,
                });

                return mqttClient;
            })
            .inSingletonScope();
    },
);
