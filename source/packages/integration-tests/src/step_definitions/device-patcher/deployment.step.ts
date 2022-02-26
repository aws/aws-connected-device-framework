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
import chai_string = require('chai-string');
import { use } from 'chai';
import { Then, When, setDefaultTimeout, TableDefinition } from 'cucumber';
import { replaceInFile, ReplaceInFileConfig } from 'replace-in-file';


import { DeploymentService, CreateDeploymentRequest } from '@cdf/device-patcher-client';
import { DEVICE_PATCHER_CLIENT_TYPES } from '@cdf/device-patcher-client';

import { container } from '../../di/inversify.config';
import { replaceTokens, RESPONSE_STATUS, validateExpectedAttributes } from '../common/common.steps';
import { world } from './device.world';
import { getAdditionalHeaders } from '../common/common.steps';
import { fail } from 'assert';
import fs from 'fs';
import { EC2Client, RunInstancesCommand, RunInstancesCommandInput } from '@aws-sdk/client-ec2';

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

const deploymentService: DeploymentService = container.get(DEVICE_PATCHER_CLIENT_TYPES.DeploymentService);

When('I create a patch deployment Task for {string} edge device with attributes', async function (deviceId: string, data: TableDefinition) {
    const deployment: CreateDeploymentRequest = buildDeploymentModel(data);

    const deploymentTask = {
        deployments: [{
            deviceId,
            deploymentTemplateName: deployment.deploymentTemplateName,
            extraVars: deployment.extraVars
        }]

    }
    try {
        this['deploymentTaskId'] = await deploymentService.createDeploymentTask(deploymentTask, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }
});

When('I launch an EC2 Instance {string} emulating as an edge device', async function (instanceName: string) {

    const activation = this['activation'];

    try {

        // prepare the device bootstrap script
        const bootstrapScript = `${__dirname}/../../../../src/testResources/ansible_ssm_install_script.txt.temp`;
        try {
            fs.copyFileSync(`${__dirname}/../../../../src/testResources/ansible_ssm_install_script.txt`, bootstrapScript);
            const options: ReplaceInFileConfig = {
                files: [bootstrapScript],
                from: '{{{activation_code}}}',
                to: activation.activationCode
            };
            await replaceInFile(options);
            options.from = '{{{activation_id}}}';
            options.to = activation.activationId;
            await replaceInFile(options);
            options.from = '{{{activation_region}}}';
            options.to = activation.activationRegion
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
                    Name: process.env.DEVICE_PATCHER_EC2_IAMINSTANCEPROFILE
                },
                TagSpecifications: [{
                    ResourceType: 'instance',
                    Tags: [{
                        Key: 'Name',
                        Value: instanceName
                    }, {
                        Key: 'cdf',
                        Value: 'ansible-patch-integration-test'
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



When('I list deployments for {string} device', async function (deviceId: string) {
    try {
        this['deployment'] = await deploymentService.listDeploymentsByDeviceId(deviceId, undefined, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }
});

When('I delete {string} for a device {string}', async function (deploymentId: string) {
    try {
        await deploymentService.deleteDeployment(deploymentId, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }
});

Then('deployments exists for {string}', async function (deviceId: string) {
    try {
        await deploymentService.listDeploymentsByDeviceId(deviceId, undefined, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }
});

Then('a list of deployments for {string} exists with attributes', async function (deviceId: string, data: TableDefinition) {
    let deployment
    try {
        deployment = await deploymentService.listDeploymentsByDeviceId(deviceId, undefined, getAdditionalHeaders(world.authToken));
    } catch (e) {
        this[RESPONSE_STATUS] = e.status;
    }

    validateExpectedAttributes(deployment, data);
});

Then('deployment Task exists with following attributes', async function (data: TableDefinition) {
    const taskId = this['deploymentTaskId'];
    let deploymentTask
    try {
        deploymentTask = await deploymentService.getDeploymentTask(taskId, getAdditionalHeaders(world.authToken));
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
        fail(`getTemplate failed, err: ${JSON.stringify(err)}`);
    }

    validateExpectedAttributes(deploymentTask, data);
})

Then('deployment exists for deployment Task with following attributes', async function (data: TableDefinition) {
    const taskId = this['deploymentTaskId'];
    let deploymentTask
    try {
        deploymentTask = await deploymentService.listDeploymentsByTaskId(taskId, getAdditionalHeaders(world.authToken));
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
        fail(`getTemplate failed, err: ${JSON.stringify(err)}`);
    }

    validateExpectedAttributes(deploymentTask, data);
})

Then('last deployment for device exists with following attributes', async function (data: TableDefinition) {
    const taskId = this['deploymentTaskId'];
    let deploymentTask
    try {
        deploymentTask = await deploymentService.listDeploymentsByTaskId(taskId, getAdditionalHeaders(world.authToken));
    } catch (err) {
        this[RESPONSE_STATUS] = err.status;
        fail(`getTemplate failed, err: ${JSON.stringify(err)}`);
    }
    
    validateExpectedAttributes(deploymentTask, data);
})

function buildDeploymentModel<T>(data: TableDefinition): T {
    const d = data.rowsHash();

    const resource = {} as T;

    Object.keys(d).forEach(key => {
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
