/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Before, setDefaultTimeout} from 'cucumber';
import { TemplatesService, TemplateModel } from '@cdf/commands-client/dist';

setDefaultTimeout(30 * 1000);

const COMMANDTEMPLATES_TEMPLATE_FEATURE_TEMPLATE_IDS:string[] = ['testCommandTemplate','testCommandTemplate2'];
const COMMANDTEMPLATES_COMMAND_FEATURE_TEMPLATE_IDS:string[] = ['testCommandsFeatureTemplateSimple','testCommandsFeatureTemplateParams','testCommandsFeatureTemplateFiles'];

let templates: TemplatesService;

Before(function () {
    templates = new TemplatesService();
});

async function deleteCommandTemplates(ids:string[]) {
    for(const id of ids) {
        await templates.deleteTemplate(id);
    }
}

async function teardown_templates_feature() {
    await deleteCommandTemplates(COMMANDTEMPLATES_TEMPLATE_FEATURE_TEMPLATE_IDS);
}

Before({tags: '@setup_templates_feature'}, async function () {
    await teardown_templates_feature();
});

Before({tags: '@teardown_templates_feature'}, async function () {
    await teardown_templates_feature();
});

async function teardown_commands_feature() {
    await deleteCommandTemplates(COMMANDTEMPLATES_COMMAND_FEATURE_TEMPLATE_IDS);
}

Before({tags: '@setup_commands_feature'}, async function () {
    await teardown_commands_feature();

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
    await teardown_commands_feature();
});
