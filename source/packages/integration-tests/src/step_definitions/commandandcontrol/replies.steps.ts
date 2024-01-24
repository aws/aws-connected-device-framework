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
import 'reflect-metadata';

import { DataTable, Then, When, setDefaultTimeout } from '@cucumber/cucumber';
import axios from 'axios';
import { use } from 'chai';

import {
    COMMANDANDCONTROL_CLIENT_TYPES,
    MessagesService,
} from '@awssolutions/cdf-commandandcontrol-client';
import { container } from '../../di/inversify.config';

import { fail } from 'assert';
import { iot, iotjobs, iotshadow, mqtt } from 'aws-iot-device-sdk-v2';
import fs from 'fs';
import os from 'os';
import {
    buildModel,
    getAdditionalHeaders,
    validateExpectedAttributes,
} from '../common/common.steps';
import { world } from './commandandcontrol.world';
import { JobsTestClient } from './jobsTestClient';

import chai_string = require('chai-string');
import path = require('path');

use(chai_string);

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(15 * 1000);

const messagesService: MessagesService = container.get(
    COMMANDANDCONTROL_CLIENT_TYPES.MessagesService
);

async function createJobsTestClient(thingName: string): Promise<JobsTestClient> {
    if (world.jobsTestClients?.[thingName] === undefined) {
        const tmpCertDir = path.join(os.tmpdir(), 'cac-certs');
        const certPath = path.join(tmpCertDir, `${thingName}-certificate.pem.crt`);
        const keyPath = path.join(tmpCertDir, `${thingName}-private.pem.key`);
        const caPath = path.join(tmpCertDir, 'AmazonRootCA1.pem');

        const ca = await axios.get<string>(
            'https://www.amazontrust.com/repository/AmazonRootCA1.pem'
        );
        fs.writeFileSync(caPath, ca.data);

        if (world.jobsTestClients === undefined) {
            world.jobsTestClients = {};
        }
        world.jobsTestClients[thingName] = new JobsTestClient(
            thingName,
            certPath,
            keyPath,
            caPath
        );
        try {
            await world.jobsTestClients[thingName].connect();
            await world.jobsTestClients[thingName].getNextJobDocument();
        } catch (e) {
            const { requestId, cfId, extendedRequestId } = e.$metadata;
            console.log({ requestId, cfId, extendedRequestId });
        }
    }
    return world.jobsTestClients[thingName];
}

When(
    'thing {string} replies to last command-and-control message as {string}',
    async function (thingName: string, action: string) {
        await reply(thingName, action);
    }
);

When(
    'thing {string} replies to last command-and-control message with payload:',
    async function (thingName: string, data: DataTable) {
        switch (world.lastCommand.deliveryMethod.type) {
            case 'TOPIC':
            case 'SHADOW':
                await reply(thingName, 'reply', data);
                break;

            case 'JOB': {
                await reply(thingName, iotjobs.model.JobStatus.IN_PROGRESS, data);
                break;
            }
            default:
                fail('not implemented yet');
        }
    }
);

When(
    'thing {string} replies to last command-and-control message as {string} with payload:',
    async function (thingName: string, action: string, data: DataTable) {
        await reply(thingName, action, data);
    }
);

async function reply(thingName: string, action: string, data?: DataTable) {
    const command = world.lastCommand;
    const recipient = await messagesService.getRecipient(
        world.lastMessageId,
        thingName,
        getAdditionalHeaders(world.authToken)
    );
    const payload = buildModel(data);

    switch (world.lastCommand.deliveryMethod.type) {
        case 'TOPIC':
            await replyToTopic(thingName, recipient.correlationId, action, payload);
            break;

        case 'SHADOW':
            await replyToShadow(
                thingName,
                recipient.correlationId,
                command.operation,
                action,
                payload
            );
            break;

        case 'JOB': {
            let client = world.jobsTestClients?.[thingName];
            if (client === undefined) {
                client = await createJobsTestClient(thingName);
            }
            try {
                await client.updateJobExecution(
                    action as iotjobs.model.JobStatus,
                    payload as { [key: string]: string }
                );
            } catch (e) {
                if (e instanceof Error) {
                    console.log(e.message);
                    console.log(e.stack);
                } else {
                    const { requestId, cfId, extendedRequestId } = e.$metadata;
                    console.log({ requestId, cfId, extendedRequestId });
                }
            }
            break;
        }

        default:
            fail('not implemented yet');
    }
}

Then(
    'last command-and-control message has replies from {string}:',
    async function (thingName: string, data: DataTable) {
        const replies = await messagesService.listReplies(
            world.lastMessageId,
            thingName,
            undefined,
            undefined,
            getAdditionalHeaders(world.authToken)
        );
        validateExpectedAttributes(replies, data, world);
    }
);

async function build_direct_mqtt_connection(
    thingName: string
): Promise<mqtt.MqttClientConnection> {
    const tmpCertDir = path.join(os.tmpdir(), 'cac-certs');
    const certPath = path.join(tmpCertDir, `${thingName}-certificate.pem.crt`);
    const keyPath = path.join(tmpCertDir, `${thingName}-private.pem.key`);
    const endpoint: string = process.env.AWS_IOT_ENDPOINT;

    const caPath = path.join(tmpCertDir, 'AmazonRootCA1.pem');
    const ca = await axios.get<string>('https://www.amazontrust.com/repository/AmazonRootCA1.pem');
    fs.writeFileSync(caPath, ca.data);

    const config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(
        certPath,
        keyPath
    );
    config_builder.with_certificate_authority_from_path(undefined, caPath);
    config_builder.with_clean_session(false);
    config_builder.with_client_id(thingName);
    config_builder.with_endpoint(endpoint);
    const c = config_builder.build();

    const client = new mqtt.MqttClient();
    return client.new_connection(c);
}

async function replyToTopic(
    thingName: string,
    correlationId: string,
    action: string,
    payload?: unknown
): Promise<void> {
    const topic = `cmd/cdf/cac/${thingName}/${correlationId}/${action}`;

    const connection = await build_direct_mqtt_connection(thingName);
    const msg = {
        timestamp: new Date().getTime(),
        payload,
    };

    try {
        await connection.connect();
        await connection.publish(topic, msg, mqtt.QoS.AtLeastOnce);
    } catch (e) {
        const { requestId, cfId, extendedRequestId } = e.$metadata;
        console.log({ requestId, cfId, extendedRequestId });
    } finally {
        await connection.disconnect();
    }
}

async function replyToShadow(
    thingName: string,
    correlationId: string,
    operation: string,
    action: string,
    payload?: unknown
): Promise<void> {
    const connection = await build_direct_mqtt_connection(thingName);

    const shadow = new iotshadow.IotShadowClient(connection);

    const req: iotshadow.model.UpdateNamedShadowRequest = {
        thingName,
        shadowName: 'cac',
        clientToken: correlationId,
        state: {
            desired: {},
            reported: {},
        },
    };

    req.state.desired[operation] = null;
    req.state.reported[operation] = {
        timestamp: new Date().getTime(),
        action,
        payload,
    };

    try {
        await connection.connect();
        await shadow.publishUpdateNamedShadow(req, mqtt.QoS.AtLeastOnce);
    } catch (e) {
        const { requestId, cfId, extendedRequestId } = e.$metadata;
        console.log({ requestId, cfId, extendedRequestId });
    } finally {
        await connection.disconnect();
    }
}
