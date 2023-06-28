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

import { Before, setDefaultTimeout} from '@cucumber/cucumber';
import { resolve } from 'path';

import { Dictionary } from '@awssolutions/cdf-lambda-invoke';
import {
    TemplatesService,
    PatchType,
    CreatePatchTemplateParams,
} from '@awssolutions/cdf-device-patcher-client';
import { DEVICE_PATCHER_CLIENT_TYPES } from '@awssolutions/cdf-device-patcher-client';

import { container } from '../di/inversify.config';
import {AUTHORIZATION_TOKEN} from '../step_definitions/common/common.steps';
import { logger } from '@awssolutions/simple-cdf-logger';
import {DescribeInstancesCommand, EC2Client, TerminateInstancesCommand} from '@aws-sdk/client-ec2';


setDefaultTimeout(30 * 1000);

const INTEGRATION_TEST_PATCH_TEMPLATE = 'integration_test_template';
const GGV2_CORE_INSTALLATION_TEMPLATE = 'ggv2_ec2_amazonlinux2_template';

const ec2 = new EC2Client({ region: process.env.AWS_REGION });

function getAdditionalHeaders(world:unknown) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

const templatesSvc:TemplatesService = container.get(DEVICE_PATCHER_CLIENT_TYPES.TemplatesService);

async function deletePatchTemplate(world:unknown, name:string) {
    try {
        await templatesSvc.deleteTemplate(name, getAdditionalHeaders(world))
    } catch (e) {
        logger.error(e)
    }
}

async function createIntegrationTestPatchTemplate(world:unknown, name:string) {
    try {
        const integration_test_playbook_path = resolve(`${__dirname}/../../../src/testResources/integration-test-playbook.yaml`);
        const template:CreatePatchTemplateParams = {
            name,
            playbookFileLocation: integration_test_playbook_path,
            description: 'Integration Test Template Ansible playbook',
            patchType: PatchType.AGENTBASED,
            extraVars: {
                commonVar1: 'commonVarVal1',
                commonVar2: 'commonVarVal2',
            }
        }
        await templatesSvc.createTemplate(template, getAdditionalHeaders(world))
    } catch (e) {
        logger.error(e)
    }
}

async function createGGV2CorePatchTemplate(world:unknown, name:string) {
    try {
        const integration_test_playbook_path = resolve(`${__dirname}/../../../src/testResources/ggv2-ec2-amazonlinux2-installer-playbook.yml`);
        const template:CreatePatchTemplateParams = {
            name,
            playbookFileLocation: integration_test_playbook_path,
            description: 'GGV2 EC2 Amazon Linux 2 Installer Template',
            patchType: PatchType.AGENTBASED
        }
        await templatesSvc.createTemplate(template, getAdditionalHeaders(world))
    } catch (e) {
        logger.error(e)
    }
}

async function cleanupEC2Instances() {
    // ec2 cleanup
    const instances = await ec2.send(new DescribeInstancesCommand({
        Filters: [{
            Name: 'tag:cdf',
            Values: ['ansible-patch-integration-test']
        }]
    }));
    const instanceIds = instances?.Reservations?.map(r => r.Instances?.map(i => i.InstanceId))?.flat() ?? [];
    if (instanceIds.length > 0) {
        await ec2.send(new TerminateInstancesCommand({ InstanceIds: instanceIds }));
    }

}

async function teardown_patches_feature(world:unknown) {
    await deletePatchTemplate(world, INTEGRATION_TEST_PATCH_TEMPLATE);
    await cleanupEC2Instances();
}

async function teardown_activation_features() {
    console.log('teardown_activation_features');
}

async function teardown_patch_templates_features(world:unknown) {
    await deletePatchTemplate(world, INTEGRATION_TEST_PATCH_TEMPLATE);
}

async function teardown_enhanced_patch_templates_features(world: unknown) {
    await deletePatchTemplate(world, GGV2_CORE_INSTALLATION_TEMPLATE);
    await cleanupEC2Instances();
}

Before({tags: '@setup_patch_features'}, async function () {
    // await teardown_patches_feature(this);
    await createIntegrationTestPatchTemplate(this, INTEGRATION_TEST_PATCH_TEMPLATE);
});

Before({tags: '@teardown_patch_features'}, async function () {
    await teardown_patches_feature(this);
});

Before({tags: '@setup_activation_features'}, async function () {
    await teardown_activation_features();
});

Before({tags: '@teardown_activation_features'}, async function () {
    await teardown_activation_features();
});

Before({tags: '@setup_patch_templates_features'}, async function () {
    await teardown_patch_templates_features(this);
});

Before({tags: '@teardown_patch_templates_features'}, async function () {
    await teardown_patch_templates_features(this);
});

Before({tags: '@setup_patch_features_enhanced'}, async function () {
    await teardown_enhanced_patch_templates_features(this);
    await createGGV2CorePatchTemplate(this, GGV2_CORE_INSTALLATION_TEMPLATE);
});

Before({tags: '@teardown_patch_features_enhanced'}, async function () {
    await teardown_enhanced_patch_templates_features(this);
});





