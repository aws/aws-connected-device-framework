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

import {
    COMMANDANDCONTROL_CLIENT_TYPES,
    CommandsService,
} from '@awssolutions/cdf-commandandcontrol-client';
import { Dictionary } from '@awssolutions/cdf-lambda-invoke';
import { Before, setDefaultTimeout } from '@cucumber/cucumber';
import fs from 'fs';
import os from 'os';
import { container } from '../di/inversify.config';
import {
    CommandAndControlProvisioningWorld,
    world,
} from '../step_definitions/commandandcontrol/commandandcontrol.world';
import { listCommands } from '../step_definitions/commandandcontrol/commands.steps';
import { AUTHORIZATION_TOKEN } from '../step_definitions/common/common.steps';
import AWS = require('aws-sdk');
import path = require('path');

setDefaultTimeout(30 * 1000);

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

function getAdditionalHeaders(world: unknown): Dictionary {
    return {
        Authorization: world[AUTHORIZATION_TOKEN],
    };
}

const iot = new AWS.Iot({ region: process.env.AWS_REGION });
const commandsService: CommandsService = container.get(
    COMMANDANDCONTROL_CLIENT_TYPES.CommandsService
);

async function deleteCommands(world: unknown, operations: string[]) {
    // list all existing commands
    const commands = await listCommands();
    for (const op of operations) {
        const opCommands = commands.filter((c) => c.operation === op);
        if (opCommands?.length > 0) {
            for (const command of opCommands) {
                await commandsService.deleteCommand(command.id, getAdditionalHeaders(world));
            }
        }
    }
}

async function createThing(thingName: string): Promise<void> {
    const rc = await iot
        .createKeysAndCertificate({
            setAsActive: true,
        })
        .promise();

    const tmpCertDir = path.join(os.tmpdir(), 'cac-certs');
    if (!fs.existsSync(tmpCertDir)) {
        fs.mkdirSync(tmpCertDir);
    }
    const certPath = path.join(tmpCertDir, `${thingName}-certificate.pem.crt`);
    fs.writeFileSync(certPath, rc.certificatePem);
    const privateKeyPath = path.join(tmpCertDir, `${thingName}-private.pem.key`);
    fs.writeFileSync(privateKeyPath, rc.keyPair.PrivateKey);
    const publicKeyPath = path.join(tmpCertDir, `${thingName}-public.pem.key`);
    fs.writeFileSync(publicKeyPath, rc.keyPair.PublicKey);

    try {
        await iot
            .deletePolicy({
                policyName: process.env.COMMANDANDCONTROL_TESTDEVICE_POLICYNAME,
            })
            .promise();
    } catch (e) {
        //ignore
    }

    try {
        await iot
            .getPolicy({
                policyName: process.env.COMMANDANDCONTROL_TESTDEVICE_POLICYNAME,
            })
            .promise();
    } catch (e) {
        const policyDocument = process.env.COMMANDANDCONTROL_TESTDEVICE_POLICYDOCUMENT;

        await iot
            .createPolicy({
                policyName: process.env.COMMANDANDCONTROL_TESTDEVICE_POLICYNAME,
                policyDocument,
            })
            .promise();
    }

    await iot
        .attachPrincipalPolicy({
            policyName: process.env.COMMANDANDCONTROL_TESTDEVICE_POLICYNAME,
            principal: rc.certificateArn,
        })
        .promise();

    const rt = await iot
        .createThing({
            thingName,
        })
        .promise();

    await iot
        .attachThingPrincipal({
            thingName: rt.thingName,
            principal: rc.certificateArn,
        })
        .promise();
}

async function deleteThing(thingName: string) {
    try {
        const jobs = await iot.listJobExecutionsForThing({ thingName }).promise();
        if ((jobs?.executionSummaries?.length ?? 0) > 0) {
            jobs.executionSummaries.forEach(async (job) => {
                try {
                    await iot.deleteJob({ jobId: job.jobId, force: true }).promise();
                } catch (e) {
                    // ignore
                }
            });
        }
    } catch (e) {
        // ignore
    }

    let certificateId;
    try {
        const thingPrincipals = await iot.listThingPrincipals({ thingName }).promise();
        const certArn = thingPrincipals.principals[0];
        certificateId = certArn.split('/')[1];

        const policies = await iot.listPrincipalPolicies({ principal: certArn }).promise();
        policies.policies.forEach(async (policy) => {
            await iot
                .detachPrincipalPolicy({ principal: certArn, policyName: policy.policyName })
                .promise();
            try {
                await iot.deletePolicy({ policyName: policy.policyName }).promise();
            } catch (e) {
                // ignore
            }
        });
        await iot.detachThingPrincipal({ thingName, principal: certArn }).promise();
    } catch (e) {
        if (e.code !== 'ResourceNotFoundException') {
            throw e;
        }
        // ignore
    }

    try {
        if (certificateId !== undefined) {
            await iot.updateCertificate({ certificateId, newStatus: 'INACTIVE' }).promise();
        }
    } catch (e) {
        // ignore
    }

    try {
        if (certificateId !== undefined) {
            await iot.deleteCertificate({ certificateId }).promise();
        }
    } catch (e) {
        // ignore
    }

    try {
        await iot.deleteThing({ thingName }).promise();
    } catch (e) {
        // ignore
    }
}

async function createThingGroup(thingGroupName: string, ...thingNames: string[]) {
    await iot
        .createThingGroup({
            thingGroupName,
        })
        .promise();

    for (const thingName of thingNames) {
        await iot
            .addThingToThingGroup({
                thingGroupName,
                thingName,
            })
            .promise();
    }
}

async function deleteThingGroup(thingGroupName: string) {
    await iot
        .deleteThingGroup({
            thingGroupName,
        })
        .promise();
}

async function teardown_commandandcontrol_topics_feature() {
    await createThing('cdf-integration-test-cac-topics-device1');
    await createThing('cdf-integration-test-cac-topics-device2');
}

Before({ tags: '@setup_commandandcontrol_topics' }, async function () {
    await deleteCommands(world, ['cdf-integration-test-reboot']);
    await teardown_commandandcontrol_topics_feature();
    await createThing('cdf-integration-test-cac-topics-device1');
    await createThing('cdf-integration-test-cac-topics-device2');
});

Before({ tags: '@teardown_commandandcontrol_topics' }, async function () {
    await teardown_commandandcontrol_topics_feature();
});

async function teardown_commandandcontrol_shadows_feature() {
    await deleteThing('cdf-integration-test-cac-shadows-device1');
    await deleteThing('cdf-integration-test-cac-shadows-device2');
    await deleteThingGroup('cdf-integration-test-cac-shadows-group1');
}

Before({ tags: '@setup_commandandcontrol_shadows' }, async function () {
    await deleteCommands(world, ['cdf-integration-test-stats']);
    await teardown_commandandcontrol_shadows_feature();
    await createThing('cdf-integration-test-cac-shadows-device1');
    await createThing('cdf-integration-test-cac-shadows-device2');
    await createThingGroup(
        'cdf-integration-test-cac-shadows-group1',
        'cdf-integration-test-cac-shadows-device1',
        'cdf-integration-test-cac-shadows-device2'
    );
});

Before({ tags: '@teardown_commandandcontrol_shadows' }, async function () {
    await teardown_commandandcontrol_shadows_feature();
});

async function teardown_commandandcontrol_jobs_feature(world: CommandAndControlProvisioningWorld) {
    await deleteThing('cdf-integration-test-cac-jobs-device1');
    await deleteThing('cdf-integration-test-cac-jobs-device2');
    await deleteThingGroup('cdf-integration-test-cac-jobs-group1');

    if (world?.jobsTestClients) {
        Object.entries(world.jobsTestClients).forEach(async ([_thingName, client]) => {
            await client.disconnect();
        });
        delete world.jobsTestClients;
    }
    world = undefined;
}

Before({ tags: '@setup_commandandcontrol_jobs' }, async function () {
    await deleteCommands(world, ['cdf-integration-test-ota', 'cdf-integration-test-ota-named']);
    await teardown_commandandcontrol_jobs_feature(world);
    await createThing('cdf-integration-test-cac-jobs-device1');
    await createThing('cdf-integration-test-cac-jobs-device2');
    await createThingGroup(
        'cdf-integration-test-cac-jobs-group1',
        'cdf-integration-test-cac-jobs-device1',
        'cdf-integration-test-cac-jobs-device2'
    );
});

Before({ tags: '@teardown_commandandcontrol_jobs' }, async function () {
    await teardown_commandandcontrol_jobs_feature(world);
});
