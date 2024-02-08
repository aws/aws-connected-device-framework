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

import { Before, setDefaultTimeout } from '@cucumber/cucumber';

import {
    DescribeInstancesCommand,
    EC2Client,
    TerminateInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
    CoresService,
    DevicesService,
    GREENGRASS2_PROVISIONING_CLIENT_TYPES,
    TemplatesService,
} from '@awssolutions/cdf-greengrass2-provisioning-client';

import { container } from '../di/inversify.config';
import { AUTHORIZATION_TOKEN } from '../step_definitions/common/common.steps';
import { getAdditionalHeaders } from '../step_definitions/notifications/notifications.utils';

import { logger } from '@awssolutions/simple-cdf-logger';
import AWS from 'aws-sdk';
import { world } from '../step_definitions/greengrass2-provisioning/greengrass2.world';
setDefaultTimeout(30 * 1000);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

const s3 = new AWS.S3({ region: process.env.AWS_REGION });
const ec2 = new EC2Client({ region: process.env.AWS_REGION });

const templatesSvc: TemplatesService = container.get(
    GREENGRASS2_PROVISIONING_CLIENT_TYPES.TemplatesService
);
const coresSvc: CoresService = container.get(GREENGRASS2_PROVISIONING_CLIENT_TYPES.CoresService);
const deviceSvc: DevicesService = container.get(
    GREENGRASS2_PROVISIONING_CLIENT_TYPES.DevicesService
);

const templateBucket = process.env.PROVISIONING_TEMPLATES_BUCKET;
const templatePrefix = process.env.PROVISIONING_TEMPLATES_PREFIX;

async function teardown(world: unknown) {
    // service cleanup
    const templates = ['IntegrationTest'];
    for (const t of templates) {
        try {
            await templatesSvc.deleteTemplate(t, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
        } catch (err) {
            logger.silly(`teardown: deleteTemplate: ${JSON.stringify(err)}`);
            // swallow the error
        }
    }

    const clientDevices: string[] = ['ClientDevice1', 'ClientDevice2'];
    for (const clientDevice of clientDevices) {
        try {
            await deviceSvc.deleteDevice(clientDevice);
        } catch (err) {
            logger.silly(`teardown: deleteDevice: ${JSON.stringify(err)}`);
            // swallow the error
        }
    }

    // core cleanup
    const gg2Cores: string[] = [
        'IntegrationTestCore1',
        'IntegrationTestCore2',
        'IntegrationTestCore3',
    ];
    try {
        await coresSvc.createCoreTask({
            options: { deprovisionClientDevices: true, deprovisionCores: true },
            type: 'Delete',
            coreVersion: '2.4.0',
            cores: gg2Cores.map((o) => {
                return { name: o, provisioningTemplate: 'UNKNOWN' };
            }),
        });
    } catch (err) {
        logger.silly(`teardown: createCoreTask: ${JSON.stringify(err)}`);
        // swallow the error
    }

    // ec2 cleanup
    const instances = await ec2.send(
        new DescribeInstancesCommand({
            Filters: [
                {
                    Name: 'tag:Name',
                    Values: gg2Cores,
                },
                {
                    Name: 'tag:cdf',
                    Values: ['greengrass2-provisioning-integration-test'],
                },
            ],
        })
    );
    const instanceIds =
        instances?.Reservations?.map((r) => r.Instances?.map((i) => i.InstanceId))?.flat() ?? [];
    if (instanceIds.length > 0) {
        await ec2.send(new TerminateInstancesCommand({ InstanceIds: instanceIds }));
    }
}

Before({ tags: '@setup_greengrass2_provisioning' }, async function () {
    await teardown(world);

    // create the provisioning template
    const integrationTestTemplate = {
        Parameters: {
            ThingName: {
                Type: 'String',
            },
            CertificatePem: {
                Type: 'String',
            },
            CaCertificatePem: {
                Type: 'String',
            },
        },
        Resources: {
            thing: {
                Type: 'AWS::IoT::Thing',
                Properties: {
                    ThingName: {
                        Ref: 'ThingName',
                    },
                },
                OverrideSettings: {
                    ThingTypeName: 'REPLACE',
                },
            },
            certificate: {
                Type: 'AWS::IoT::Certificate',
                Properties: {
                    CACertificatePem: {
                        Ref: 'CaCertificatePem',
                    },
                    CertificatePem: {
                        Ref: 'CertificatePem',
                    },
                    Status: 'ACTIVE',
                },
                OverrideSettings: {
                    Status: 'REPLACE',
                },
            },
            policy: {
                Type: 'AWS::IoT::Policy',
                Properties: {
                    PolicyName: 'CDFGreengrass2CorePolicy',
                },
            },
        },
        CDF: {
            createDeviceCertificate: true,
            attachAdditionalPolicies: [
                {
                    name: 'CDFGreengrass2CorePolicy',
                },
            ],
        },
    };

    // upload to S3
    const putObjectRequest = {
        Bucket: templateBucket,
        Key: `${templatePrefix}Greengrass2IntegrationTestProvisioningTemplate.json`,
        Body: JSON.stringify(integrationTestTemplate),
    };
    await s3.putObject(putObjectRequest).promise();
});

Before({ tags: '@teardown_greengrass2_provisioning' }, async function () {
    await teardown(world);
});
