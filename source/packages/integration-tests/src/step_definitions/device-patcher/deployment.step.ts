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

import { DataTable, setDefaultTimeout, Then, When } from '@cucumber/cucumber';
import { use } from 'chai';
import { replaceInFile, ReplaceInFileConfig } from 'replace-in-file';

import chai_string = require('chai-string');

import {
    CreatePatchRequest,
    DEVICE_PATCHER_CLIENT_TYPES,
    PatchService,
} from '@awssolutions/cdf-device-patcher-client';

import { EC2Client, RunInstancesCommand, RunInstancesCommandInput } from '@aws-sdk/client-ec2';
import { fail } from 'assert';
import fs from 'fs';
import { container } from '../../di/inversify.config';
import {
    getAdditionalHeaders,
    replaceTokens,
    RESPONSE_STATUS,
    validateExpectedAttributes,
} from '../common/common.steps';
import { world } from './device.world';

const ec2: EC2Client = new EC2Client({ region: process.env.AWS_REGION });

use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const patchService: PatchService = container.get(DEVICE_PATCHER_CLIENT_TYPES.PatchService);

When(
    'I create a patch Task for {string} edge device with attributes',
    async function (deviceId: string, data: DataTable) {
        const patch: CreatePatchRequest = buildPatchModel(data);

        const patchTask = {
            patches: [
                {
                    deviceId,
                    patchTemplateName: patch.patchTemplateName,
                    extraVars: patch.extraVars,
                },
            ],
        };
        try {
            this['patchTaskId'] = await patchService.createPatchTask(
                patchTask,
                getAdditionalHeaders(world.authToken)
            );
        } catch (e) {
            this[RESPONSE_STATUS] = e.status;
        }
    }
);

When(
    'I launch an EC2 Instance {string} emulating as an edge device',
    async function (instanceName: string) {
        const activation = this['activation'];

        try {
            // prepare the device bootstrap script
            const bootstrapScript = `${__dirname}/../../../../src/testResources/ansible_ssm_install_script.txt.temp`;
            try {
                fs.copyFileSync(
                    `${__dirname}/../../../../src/testResources/ansible_ssm_install_script.txt`,
                    bootstrapScript
                );
                const options: ReplaceInFileConfig = {
                    files: [bootstrapScript],
                    from: '{{{activation_code}}}',
                    to: activation.activationCode,
                };
                await replaceInFile(options);
                options.from = '{{{activation_id}}}';
                options.to = activation.activationId;
                await replaceInFile(options);
                options.from = '{{{activation_region}}}';
                options.to = activation.activationRegion;
                await replaceInFile(options);
            } catch (err) {
                console.log(`preparing bootstrap script failed: ${err}`);
                throw err;
            }

            // launch the ec2 instance
            try {
                const userData = fs.readFileSync(bootstrapScript, 'utf8');
                const params: RunInstancesCommandInput = {
                    ImageId: process.env.DEVICE_PATCHER_EC2_IMAGEID,
                    InstanceType: process.env.DEVICE_PATCHER_EC2_INSTANCETYPE,
                    IamInstanceProfile: {
                        Name: process.env.DEVICE_PATCHER_EC2_IAMINSTANCEPROFILE,
                    },
                    TagSpecifications: [
                        {
                            ResourceType: 'instance',
                            Tags: [
                                {
                                    Key: 'Name',
                                    Value: instanceName,
                                },
                                {
                                    Key: 'cdf',
                                    Value: 'ansible-patch-integration-test',
                                },
                            ],
                        },
                    ],
                    UserData: Buffer.from(userData).toString('base64'),
                    MinCount: 1,
                    MaxCount: 1,
                };
                await ec2.send(new RunInstancesCommand(params));
            } catch (err) {
                console.log(`launching ec2 failed: ${err}`);
                throw err;
            }
        } catch (err) {
            world.errStatus = err.status;
            fail(`launching core device failed, err: ${JSON.stringify(err)}`);
        }
    }
);

When('I list patches for {string} device', async function (deviceId: string) {
    try {
        this['patches'] = await patchService.listPatchesByDeviceId(
            deviceId,
            undefined,
            getAdditionalHeaders(world.authToken)
        );
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }
});

When('I delete {string} for a device {string}', async function (patchId: string) {
    try {
        await patchService.deletePatch(patchId, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }
});

Then('patches exists for {string}', async function (deviceId: string) {
    try {
        await patchService.listPatchesByDeviceId(
            deviceId,
            undefined,
            getAdditionalHeaders(world.authToken)
        );
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }
});

Then(
    'a list of patches for {string} exists with attributes',
    async function (deviceId: string, data: DataTable) {
        let patches;
        try {
            patches = await patchService.listPatchesByDeviceId(
                deviceId,
                undefined,
                getAdditionalHeaders(world.authToken)
            );
        } catch (e) {
            this[RESPONSE_STATUS] = e.status;
        }

        validateExpectedAttributes(patches, data);
    }
);

Then('patch Task exists with following attributes', async function (data: DataTable) {
    const taskId = this['patchTaskId'];
    let patchTask;
    try {
        patchTask = await patchService.getPatchTask(taskId, getAdditionalHeaders(world.authToken));
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
        fail(`getTemplate failed, err: ${JSON.stringify(err)}`);
    }

    validateExpectedAttributes(patchTask, data);
});

Then('patch exists for patch Task with following attributes', async function (data: DataTable) {
    const taskId = this['patchTaskId'];
    let patchTask;
    try {
        patchTask = await patchService.listPatchesByTaskId(
            taskId,
            getAdditionalHeaders(world.authToken)
        );
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
        fail(`getTemplate failed, err: ${JSON.stringify(err)}`);
    }

    validateExpectedAttributes(patchTask, data);
});

Then('last patch for device exists with following attributes', async function (data: DataTable) {
    const taskId = this['patchTaskId'];
    let patchTask;
    try {
        patchTask = await patchService.listPatchesByTaskId(
            taskId,
            getAdditionalHeaders(world.authToken)
        );
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
        fail(`getTemplate failed, err: ${JSON.stringify(err)}`);
    }

    validateExpectedAttributes(patchTask, data);
});

Then(
    'patch for {string} exists with following attributes',
    async function (deviceId: string, data: DataTable) {
        let patch;
        try {
            patch = await patchService.listPatchesByDeviceId(
                deviceId,
                undefined,
                getAdditionalHeaders(world.authToken)
            );
        } catch (err) {
            this[RESPONSE_STATUS] = err.status;
            fail(`listPatchesByDeviceId failed, err: ${JSON.stringify(err)}`);
        }

        validateExpectedAttributes(patch, data);
    }
);

Then(
    'I create a patch patch Task for {string} edge device using {string} template',
    async function (deviceId: string, template: string) {
        const artifacts_certs_bucket = this['core']?.artifacts?.certs?.bucket;
        const artifacts_certs_key = this['core']?.artifacts?.certs?.key;
        const artifacts_config_bucket = this['core']?.artifacts?.config?.bucket;
        const artifacts_config_key = this['core']?.artifacts?.config?.key;

        const patch: CreatePatchRequest = {
            deviceId,
            patchTemplateName: template,
            extraVars: {
                iot_device_cred_zip_url:
                    '${aws:s3:presign:https://' +
                    artifacts_certs_bucket +
                    '/' +
                    artifacts_certs_key +
                    '?expiresIn=604800}',
                iot_device_config_url:
                    '${aws:s3:presign:https://' +
                    artifacts_config_bucket +
                    '/' +
                    artifacts_config_key +
                    '?expiresIn=604800}',
            },
        };

        const patchTask = {
            patches: [patch],
        };
        try {
            this['patchTaskId'] = await patchService.createPatchTask(
                patchTask,
                getAdditionalHeaders(world.authToken)
            );
        } catch (e) {
            this[RESPONSE_STATUS] = e.status;
        }
    }
);

function buildPatchModel<T>(data: DataTable): T {
    const d = data.rowsHash();

    const resource = {} as T;

    Object.keys(d).forEach((key) => {
        const value = replaceTokens(d[key]);
        if (value.startsWith('{') || value.startsWith('[')) {
            resource[key] = JSON.parse(value);
        } else if (value === '___null___') {
            resource[key] = null;
        } else if (value === '___undefined___') {
            delete resource[key];
        } else {
            resource[key] = value;
        }
    });

    return resource;
}
