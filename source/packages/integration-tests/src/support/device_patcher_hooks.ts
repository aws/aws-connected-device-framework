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
import AWS = require('aws-sdk');

import { Dictionary } from '@cdf/lambda-invoke';
import { TemplatesService, DeploymentTemplate } from '@cdf/device-patcher-client';
import { DEVICE_PATCHER_CLIENT_TYPES } from '@cdf/device-patcher-client';

import { container } from '../di/inversify.config';
import {AUTHORIZATION_TOKEN} from '../step_definitions/common/common.steps';
import {DeploymentSourceType, DeploymentType} from '@cdf/device-patcher-client';
import {logger} from '../step_definitions/utils/logger';
import {DescribeInstancesCommand, EC2Client, TerminateInstancesCommand} from '@aws-sdk/client-ec2';


setDefaultTimeout(30 * 1000);


const DEPLOYMENT_TEMPLATE = 'test_patch_template';

const artifactsBucket = process.env.DEVICE_PATCHER_S3_ARTIFACTS_BUCKET;
const artifactsPrefix = process.env.DEVICE_PATCHER_S3_ARTIFACTS_PREFIX;

const s3 = new AWS.S3({ region: process.env.AWS_REGION });
const ec2 = new EC2Client({ region: process.env.AWS_REGION });


function getAdditionalHeaders(world:unknown) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

const templatesSvc:TemplatesService = container.get(DEVICE_PATCHER_CLIENT_TYPES.TemplatesService);

async function deleteDeploymentTemplate(world:unknown, name:string) {
    try {
        await templatesSvc.deleteTemplate(name, getAdditionalHeaders(world))
    } catch (e) {
        logger.error(e)
    }
}

async function createDeploymentTemplate(world:unknown, name:string) {
    const template:DeploymentTemplate = {
        name,
        "description": "EC2 AMZLINUX2 GGV2 Core Patch installation template",
        "deploymentType": DeploymentType.AGENTBASED,
        "playbookSource": {
            "type": DeploymentSourceType.S3,
            "bucket":artifactsBucket,
            "prefix":`${artifactsPrefix}playbooks/integration-test-playbook.yaml`
        },
        "extraVars": {
            "commonVar1": "commonVarVal1",
            "commonVar2": "commonVarVal2",
        }
    }
    await templatesSvc.saveTemplate(template, getAdditionalHeaders(world))
}

async function teardown_deployments_feature(world:unknown) {
    await deleteDeploymentTemplate(world, DEPLOYMENT_TEMPLATE);

    const instanceNames: string[] = ['ec2_edge_device_01'];

    // ec2 cleanup
    const instances = await ec2.send(new DescribeInstancesCommand({
        Filters: [{
            Name: 'tag:Name',
            Values: instanceNames
        }, {
            Name: 'tag:cdf',
            Values: ['ansible-patch-integration-test']
        }]
    }));
    const instanceIds = instances?.Reservations?.map(r => r.Instances?.map(i => i.InstanceId))?.flat() ?? [];
    if (instanceIds.length > 0) {
        await ec2.send(new TerminateInstancesCommand({ InstanceIds: instanceIds }));
    }
}

async function teardown_activation_features() {
}

async function teardown_deployment_templates_features(world:unknown) {
    await deleteDeploymentTemplate(world, DEPLOYMENT_TEMPLATE);
}

Before({tags: '@setup_deployment_features'}, async function () {
    await teardown_deployments_feature(this);
    await createDeploymentTemplate(this, DEPLOYMENT_TEMPLATE)

    const txt = `
---
- hosts: all
  remote_user: ec2_user
  gather_facts: false
  become: yes
  vars:
    # Required params, needed to be passed as env vars i.e. flag: --extraVars "commonVar1=commonVarVal1"
    commonVar1: ""
    commonVar2: ""
    uniqueVar1: ""
    uniqueVar2: ""

  tasks:
    - name: 'Check mandatory variables are defined'
      assert:
        that:
          - commonVar1 != ""
          - commonVar2 != ""
          - uniqueVar1 != ""
          - uniqueVar2 != ""
        fail_msg: "Missing required envVars "
        success_msg: "Required Variables are defined"
`

    // upload to S3
    const putObjectRequest = {
        Bucket: artifactsBucket,
        Key: `${artifactsPrefix}playbooks/integration-test-playbook.yaml`,
        Body: txt
    };
    await s3.putObject(putObjectRequest).promise();
});

Before({tags: '@teardown_deployment_features'}, async function () {
    await teardown_deployments_feature(this);
});

Before({tags: '@setup_activation_features'}, async function () {
    await teardown_activation_features();
});

Before({tags: '@teardown_activation_features'}, async function () {
    await teardown_activation_features();
});

Before({tags: '@setup_deployment_templates_features'}, async function () {
    await teardown_deployment_templates_features(this);
});

Before({tags: '@teardown_deployment_templates_features'}, async function () {
    await teardown_deployment_templates_features(this);
});





