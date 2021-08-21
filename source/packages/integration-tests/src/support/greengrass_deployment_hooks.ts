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

import { Before, setDefaultTimeout} from 'cucumber';
import AWS = require('aws-sdk');
import config from 'config';

import { Dictionary } from '@cdf/lambda-invoke';
import { TemplatesService, DeploymentTemplate } from '@cdf/greengrass-deployment-client';
import { GREENGRASS_DEPLOYMENT_CLIENT_TYPES } from '@cdf/greengrass-deployment-client';

import { container } from '../di/inversify.config';
import {AUTHORIZATION_TOKEN} from '../step_definitions/common/common.steps';
import {DeploymentSourceType, DeploymentTemplateType} from '@cdf/greengrass-deployment-client/dist';
import {logger} from '../step_definitions/utils/logger';
import {Iot} from 'aws-sdk';


setDefaultTimeout(30 * 1000);

const iot = new AWS.Iot({region: config.get('aws.region')});

const DEPLOYMENT_TEMPLATE = 'test_template';
const TEST_CORE_NAME = 'gg_test_core'

function getAdditionalHeaders(world:unknown) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

const templatesSvc:TemplatesService = container.get(GREENGRASS_DEPLOYMENT_CLIENT_TYPES.TemplatesService);

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
        "description": "Linux GG Core installation template",
        "type": DeploymentTemplateType.AGENTBASED,
        "source": {
            "type": DeploymentSourceType.S3,
            "bucket":"<some-bucket>",
            "prefix":"<some-prefix>"
        }
    }
    await templatesSvc.saveTemplate(template, getAdditionalHeaders(world))
}

async function createThing(thingName:string) {
    const thingParams: Iot.Types.CreateThingRequest = {
        thingName,
        attributePayload: {
            attributes: {}
        }
    };
    try {
        await iot.createThing(thingParams).promise();
    } catch (e) {
        // ignore any errors
    }

}

async function deleteThing(thingName:string) {
    const params:Iot.Types.DeleteThingRequest = {
        thingName,
    };
    try {
        await iot.deleteThing(params).promise();
    } catch (e) {
        // ignore any errors
    }
}

async function teardown_deployments_feature(world:unknown) {
    await deleteDeploymentTemplate(world, DEPLOYMENT_TEMPLATE);
    await deleteThing(TEST_CORE_NAME);
}

async function teardown_activation_features() {
    await deleteThing(TEST_CORE_NAME);
}

Before({tags: '@setup_deployment_features'}, async function () {
    await teardown_deployments_feature(this);
    await createDeploymentTemplate(this, DEPLOYMENT_TEMPLATE)
    await createThing(TEST_CORE_NAME);
});

Before({tags: '@teardown_deployment_features'}, async function () {
    await teardown_deployments_feature(this);
});

Before({tags: '@setup_activation_features'}, async function () {
    await teardown_activation_features();
    await createThing(TEST_CORE_NAME);
});

Before({tags: '@teardown_activation_features'}, async function () {
    await teardown_activation_features();
});





