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

import { fail } from 'assert';
import { expect, use } from 'chai';
import { Given, setDefaultTimeout, TableDefinition, Then, When } from 'cucumber';
import * as fs from 'fs';
import { replaceInFile, ReplaceInFileConfig } from 'replace-in-file';
import yaml from 'js-yaml';
import { EC2Client, RunInstancesCommand, RunInstancesCommandInput } from '@aws-sdk/client-ec2';
import { } from '@aws-sdk/client-greengrassv2';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
    Core, CoresService, CoreTask, GREENGRASS2_PROVISIONING_CLIENT_TYPES, NewCoreTask
} from '@cdf/greengrass2-provisioning-client';

import { container } from '../../di/inversify.config';
import { buildModel, streamToString, validateExpectedAttributes } from '../common/common.steps';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { world } from './greengrass2.world';

import chai_string = require('chai-string');
import { Readable } from "stream";

use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const coresService: CoresService = container.get(GREENGRASS2_PROVISIONING_CLIENT_TYPES.CoresService);
const s3: S3Client = new S3Client({ region: process.env.AWS_REGION });
const ec2: EC2Client = new EC2Client({ region: process.env.AWS_REGION });

Given('greengrass2-provisioning core device {string} does not exist', async function (name: string) {
    try {
        await coresService.getCore(name, getAdditionalHeaders(world.authToken));
        expect.fail('Not found should have be thrown');
    } catch (err) {
        expect(err.status).to.eq(404);
    }
});

Given('greengrass2-provisioning core device {string} exists with attributes:', async function (name: string, data: TableDefinition) {
    let core: Core;
    try {
        core = await coresService.getCore(name, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus = err.status;
        fail(`getCore failed, err: ${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(core, data);
});

Then('config file for {string} should not exists', async function (name: string) {
    try {
        await s3.send(new GetObjectCommand({
            Bucket: process.env.GREENGRASS2PROVISIONING_S3_ARTIFACTS_BUCKET,
            Key: `${process.env.GREENGRASS2PROVISIONING_S3_ARTIFACTS_PREFIX}${name}/${name}/installerConfig.yml`
        }))
        expect.fail('Not found should have be thrown');
    } catch (err) {
        expect(err.message).to.eq('NoSuchKey');
    }
});

Then('config file for {string} exists with attributes:', async function (name: string, data: TableDefinition) {
    let config: unknown;
    try {
        const response = await s3.send(new GetObjectCommand({
            Bucket: process.env.GREENGRASS2PROVISIONING_S3_ARTIFACTS_BUCKET,
            Key: `${process.env.GREENGRASS2PROVISIONING_S3_ARTIFACTS_PREFIX}${name}/${name}/installerConfig.yml`
        }))
        const configString = await streamToString(response.Body as Readable)
        config = yaml.load(configString)
    } catch (err) {
        world.errStatus = err.status;
        expect.fail(`getConfig failed: err:${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(config, data);
});

Then('greengrass2-provisioning core device {string} exists', async function (name: string) {
    try {
        await coresService.getCore(name, getAdditionalHeaders(world.authToken))
    } catch (err) {
        world.errStatus = err.status;
        expect.fail('Should have been found');
    }
});

When('I create greengrass2-provisioning core task with attributes:', async function (data: TableDefinition) {
    delete world.lastCoreTaskId;
    try {
        const task: NewCoreTask = buildModel(data);
        world.lastCoreTaskId = await coresService.createCoreTask(task, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus = err.status;
        fail(`createCoreTask failed, err: ${JSON.stringify(err)}`);
    }
});

When('I install new greengrass2-provisioning core device {string} on EC2', async function (coreName: string) {


    try {
        // generate presigned url to allow the device to download certs
        let presignedUrl, configPresignedUrl;
        try {
            const s3GetCertsCmd = new GetObjectCommand({
                Bucket: process.env.GREENGRASS2PROVISIONING_S3_ARTIFACTS_BUCKET,
                Key: `${process.env.GREENGRASS2PROVISIONING_S3_ARTIFACTS_PREFIX}${coreName}/${coreName}/certs.zip`
            });

            presignedUrl = await getSignedUrl(s3, s3GetCertsCmd, { expiresIn: 600 });

            // generate presigned url to allow the device to download the configuration
            const s3GetConfigCmd = new GetObjectCommand({
                Bucket: process.env.GREENGRASS2PROVISIONING_S3_ARTIFACTS_BUCKET,
                Key: `${process.env.GREENGRASS2PROVISIONING_S3_ARTIFACTS_PREFIX}${coreName}/${coreName}/installerConfig.yml`
            });

            configPresignedUrl = await getSignedUrl(s3, s3GetConfigCmd, { expiresIn: 600 });

        } catch (err) {
            console.log(`presignedurl failed: ${err}`);
            throw err;
        }

        // prepare the device bootstrap script
        const bootstrapScript = `${__dirname}/../../../../src/testResources/ggv2_core_device_install_script.txt.temp`;
        try {
            fs.copyFileSync(`${__dirname}/../../../../src/testResources/ggv2_core_device_install_script.txt`, bootstrapScript);
            const options: ReplaceInFileConfig = {
                files: [bootstrapScript],
                from: '{{{presigned_url}}}',
                to: presignedUrl
            };
            await replaceInFile(options);
            options.from = '{{{config_presigned_url}}}';
            options.to = configPresignedUrl;
            await replaceInFile(options);

        } catch (err) {
            console.log(`preparing bootstrap script failed: ${err}`);
            throw err;
        }

        // launch the ec2 instance
        try {
            const userData = fs.readFileSync(bootstrapScript, 'utf8');
            const params: RunInstancesCommandInput = {
                ImageId: process.env.GREENGRASS2PROVISIONING_EC2_IMAGEID,
                InstanceType: process.env.GREENGRASS2PROVISIONING_EC2_INSTANCETYPE,
                IamInstanceProfile: {
                    Name: process.env.GREENGRASS2PROVISIONING_EC2_IAMINSTANCEPROFILE
                },
                TagSpecifications: [{
                    ResourceType: 'instance',
                    Tags: [{
                        Key: 'Name',
                        Value: coreName
                    }, {
                        Key: 'cdf',
                        Value: 'greengrass2-provisioning-integration-test'
                    }]
                }
                ],
                UserData: Buffer.from(userData).toString('base64'),
                MinCount: 1,
                MaxCount: 1
            }
            await ec2.send(new RunInstancesCommand(params));
        } catch (err) {
            console.log(`launching ec2 failed: ${err}`);
            throw err;
        }

    } catch (err) {
        world.errStatus = err.status;
        fail(`launching core device failed, err: ${JSON.stringify(err)}`);
    }
});

When('I delete greengrass2 core {string}', async function (coreName: string) {
    try {
        await coresService.createCoreTask({ type: 'Delete', coreVersion: '2.4.0', cores: [{ name: coreName, provisioningTemplate: 'EMPTY' }] }, getAdditionalHeaders(world.authToken))
    } catch (err) {
        world.errStatus = err.status;
        fail(`removeCoreTask failed, err: ${JSON.stringify(err)}`);
    }
})

When('I wait until greengrass2-provisioning core device {string} is {string}', { timeout: 120 * 1000 }, async function (coreName: string, deviceStatus: string) {
    let core;
    try {
        core = await coresService.getCore(coreName, getAdditionalHeaders(world.authToken))
    } catch (err) {
        // ignore
    }
    const waitArray = new Int32Array(new SharedArrayBuffer(1024));
    while (core?.device?.status !== deviceStatus) {
        console.log(`core ${coreName} is ${core?.device?.status} but waiting to be ${deviceStatus}\n`);
        Atomics.wait(waitArray, 0, 0, 5000);
        try {
            core = await coresService.getCore(coreName, getAdditionalHeaders(world.authToken))
        } catch (err) {
            // ignore
        }
    }
    expect(core?.device?.status).to.eq(deviceStatus);
});

Then('last greengrass2-provisioning core task exists with attributes:', async function (data: TableDefinition) {
    let task: CoreTask;
    try {
        task = await coresService.getCoreTask(world.lastCoreTaskId, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus = err.status;
        fail(`getCoreTask failed, err: ${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(task, data);
});
