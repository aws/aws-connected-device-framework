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

import { use } from 'chai';
import { setDefaultTimeout, TableDefinition, Then, When } from 'cucumber';
import axios from 'axios';

import { container } from '../../di/inversify.config';
import { COMMANDANDCONTROL_CLIENT_TYPES, MessagesService } from '@cdf/commandandcontrol-client';

import {iot,mqtt,iotshadow, iotjobs} from 'aws-iot-device-sdk-v2';

import chai_string = require('chai-string');
import { world } from './commandandcontrol.world';
import { getAdditionalHeaders, validateExpectedAttributes, buildModel } from '../common/common.steps';
import { fail } from 'assert';
import { JobsTestClient } from './jobsTestClient';
import fs from 'fs';
import os from 'os';
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

const messagesService: MessagesService = container.get(COMMANDANDCONTROL_CLIENT_TYPES.MessagesService);

async function createClient(thingName:string) {
  let client = world.jobsTestClients[thingName];
  if (client===undefined) {
    const tmpCertDir = path.join(os.tmpdir(), 'cac-certs');
    const certPath = path.join(tmpCertDir, `${thingName}-certificate.pem.crt`);
    const keyPath = path.join(tmpCertDir, `${thingName}-private.pem.key`);
    const caPath = path.join(tmpCertDir, 'AmazonRootCA1.pem');

    const ca = await axios.get<string>('https://www.amazontrust.com/repository/AmazonRootCA1.pem');
    fs.writeFileSync(caPath, ca.data);

    client = new JobsTestClient(thingName, certPath, keyPath, caPath);
    await client.connect();
    await client.getNextJobDocument();
    world.jobsTestClients[thingName] = client;
  }
}

When('thing {string} replies to last command-and-control message as {string}', async function (thingName:string,action:string) {
  switch(world.lastCommand.deliveryMethod.type) {
    case 'TOPIC':
    case 'SHADOW':
      await reply(thingName, action);
      break;

    case 'JOB': {
      await reply(thingName, action);
      break;
    }
    default:
      fail('not implemented yet');
  }
});

When('thing {string} replies to last command-and-control message with payload:', async function (thingName:string, data: TableDefinition) {
  switch(world.lastCommand.deliveryMethod.type) {
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
});

When('thing {string} replies to last command-and-control message as {string} with payload:', async function (thingName:string, action:string, data: TableDefinition) {
  await reply(thingName, action, data);
});

async function reply(thingName:string, action:string, data?:TableDefinition) {
  const command = world.lastCommand;
  const recipient = await messagesService.getRecipient(world.lastMessageId, thingName, getAdditionalHeaders(world.authToken));
  const payload =  buildModel(data);

  switch(world.lastCommand.deliveryMethod.type) {
    case 'TOPIC':
      await replyToTopic(thingName, recipient.correlationId, action, payload)
      break;

    case 'SHADOW':
      await replyToShadow(thingName, recipient.correlationId, command.operation, action, payload)
      break;

    case 'JOB': {
      let client = world.jobsTestClients[thingName];
      if (client===undefined) {
        await createClient(thingName);
        client = world.jobsTestClients[thingName];
      }
      await client.updateJobExecution(action as iotjobs.model.JobStatus, payload as {[key: string]: string});
      break;
    }

    default:
      fail('not implemented yet');

  }}

Then('last command-and-control message has replies from {string}:', async function (thingName:string, data: TableDefinition) {
  const replies = await messagesService.listReplies(world.lastMessageId, thingName, undefined, undefined, getAdditionalHeaders(world.authToken));
  validateExpectedAttributes(replies, data, world);
});

function build_direct_mqtt_connection(thingName:string) : mqtt.MqttClientConnection {

  const tmpCertDir = path.join(os.tmpdir(), 'cac-certs');
  const certPath = path.join(tmpCertDir, `${thingName}-certificate.pem.crt`);
  const keyPath = path.join(tmpCertDir, `${thingName}-private.pem.key`);
  const caPath = path.join(tmpCertDir, 'AmazonRootCA1.pem');
  const endpoint:string = process.env.AWS_IOT_ENDPOINT;

  let config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(certPath, keyPath);
  config_builder.with_certificate_authority_from_path(undefined, caPath);
  config_builder.with_clean_session(false);
  config_builder.with_client_id(thingName);
  config_builder.with_endpoint(endpoint);
  const c = config_builder.build();

  const client = new mqtt.MqttClient();
  return client.new_connection(c);
}

async function replyToTopic(thingName:string, correlationId:string, action:string, payload?:unknown) : Promise<void> {
  const topic = `cmd/cdf/cac/${thingName}/${correlationId}/${action}`;

  const connection = build_direct_mqtt_connection(thingName);
  const msg = {
    timestamp:(new Date()).getTime(),
    payload
  }

  await connection.connect()
  await connection.publish(topic, msg, mqtt.QoS.AtLeastOnce);
  await connection.disconnect();

}

async function replyToShadow(thingName:string, correlationId:string, operation:string, action:string, payload?:unknown) : Promise<void> {
  const connection = build_direct_mqtt_connection(thingName);

  const shadow = new iotshadow.IotShadowClient(connection);

  await connection.connect()

  const req:iotshadow.model.UpdateNamedShadowRequest = {
    thingName,
    shadowName: 'cdf-cac',
    clientToken: correlationId,
    state: {
      desired: {
      },
      reported: {
      }
    }
  };

  req.state.desired[operation] = null;
  req.state.reported[operation] = {
    timestamp:(new Date()).getTime(),
    action,
    payload
  };

  await shadow.publishUpdateNamedShadow(req, mqtt.QoS.AtLeastOnce);

  await connection.disconnect();
}



