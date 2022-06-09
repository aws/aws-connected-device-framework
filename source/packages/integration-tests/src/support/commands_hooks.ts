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
import { TemplatesService, TemplateModel } from '@cdf/commands-client';
import {container} from '../di/inversify.config';
import {COMMANDS_CLIENT_TYPES} from '@cdf/commands-client/dist';
import { Dictionary } from '@cdf/lambda-invoke';
import { AUTHORIZATION_TOKEN } from '../step_definitions/common/common.steps';

setDefaultTimeout(30 * 1000);

const COMMANDTEMPLATES_TEMPLATE_FEATURE_TEMPLATE_IDS:string[] = ['testCommandTemplate','testCommandTemplate2'];
const COMMANDTEMPLATES_COMMAND_FEATURE_TEMPLATE_IDS:string[] = ['testCommandsFeatureTemplateSimple','testCommandsFeatureTemplateParams','testCommandsFeatureTemplateFiles'];

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

function getAdditionalHeaders(world:unknown) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

const templates:TemplatesService = container.get(COMMANDS_CLIENT_TYPES.TemplatesService);

async function deleteCommandTemplates(world:unknown, ids:string[]) {
    for(const id of ids) {
        await templates.deleteTemplate(id, getAdditionalHeaders(world))
        .catch(_err=> {
            // ignore error in case it did not already exist
        });
    }
}

async function teardown_templates_feature(world:unknown) {
    await deleteCommandTemplates(world,COMMANDTEMPLATES_TEMPLATE_FEATURE_TEMPLATE_IDS);
}

Before({tags: '@setup_templates_feature'}, async function () {
    await teardown_templates_feature(this);
});

Before({tags: '@teardown_templates_feature'}, async function () {
    await teardown_templates_feature(this);
});

async function teardown_commands_feature(world:unknown) {
    await deleteCommandTemplates(world, COMMANDTEMPLATES_COMMAND_FEATURE_TEMPLATE_IDS);
}

Before({tags: '@setup_commands_feature'}, async function () {
    await teardown_commands_feature(this);

    // create a simple template
    const simple = {
        templateId: 'testCommandsFeatureTemplateSimple',
        operation: 'simple',
        document: '{"xxx":"yyy"}'
    } as TemplateModel;
    await templates.createTemplate(simple);

    // create a simple template requiring files
    const withParams = {
        templateId: 'testCommandsFeatureTemplateParams',
        operation: 'files',
        document: '{"xxx":"yyy"}',
        requiredDocumentParameters: ['paramA','paramB']
    } as TemplateModel;
    await templates.createTemplate(withParams);

    // create a simple template requiring files
    const withFiles = {
        templateId: 'testCommandsFeatureTemplateFiles',
        operation: 'files',
        document: '{"xxx":"yyy"}',
        requiredFiles: ['fileA','fileB']
    } as TemplateModel;
    await templates.createTemplate(withFiles);

});

Before({tags: '@teardown_commands_feature'}, async function () {
    await teardown_commands_feature(this);
});
