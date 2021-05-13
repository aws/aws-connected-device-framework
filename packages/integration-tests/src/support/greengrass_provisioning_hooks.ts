/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Before, setDefaultTimeout} from 'cucumber';
import AWS = require('aws-sdk');
import config from 'config';
import { GREENGRASS_PROVISIONING_CLIENT_TYPES, GroupsService, TemplatesService } from '@cdf/greengrass-provisioning-client/dist';
import { container } from '../di/inversify.config';
import { PROVISIONING_CLIENT_TYPES, ThingsService } from '@cdf/provisioning-client/dist';
import { getAdditionalHeaders } from '../step_definitions/notifications/notifications.utils';
import { AUTHORIZATION_TOKEN } from '../step_definitions/common/common.steps';

setDefaultTimeout(30 * 1000);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

const iot = new AWS.Iot({region: config.get('aws.region')});
const gg = new AWS.Greengrass({region: config.get('aws.region')});
const s3 = new AWS.S3({region: config.get('aws.region')});

const groupsSvc:GroupsService = container.get(GREENGRASS_PROVISIONING_CLIENT_TYPES.GroupsService);
const templatesSvc:TemplatesService = container.get(GREENGRASS_PROVISIONING_CLIENT_TYPES.TemplatesService);
const thingsSvc:ThingsService = container.get(PROVISIONING_CLIENT_TYPES.ThingsService);

const templateBucket = config.get('provisioning.templates.bucket') as string;
const templatePrefix = config.get('provisioning.templates.prefix') as string;

async function teardown(world:unknown) {
    // logger.debug(`\ngreengrass_provisioning_hooks: teardown: in:`);

    // IoT cleanup - delete greengrass groups
    const ggGroupNames = ['IntegrationTestGroup1', 'IntegrationTestGroup2', 'IntegrationTestTemplateGroup'];
    const ggGroupIds:string[] = [];
    let res: AWS.Greengrass.ListGroupsResponse;
    while (true) {
        res = await gg.listGroups().promise();
        const filtered = res.Groups?.filter(g=> ggGroupNames.includes(g.Name)).map(g=> g.Id);
        if (filtered) {
            ggGroupIds.push(...filtered);
        }
        if (res.NextToken) {
            res = await gg.listGroups({NextToken:res.NextToken}).promise();
        } else {
            break;
        }
    }
    for (const g of ggGroupIds) {
        try {
            // logger.debug(`\ngreengrass_provisioning_hooks: teardown: gg.deleteGroup: ${g}`);
            await gg.deleteGroup({GroupId:g}).promise();
        } catch (err) {
            // swallow the error
            // logger.error(`\ngreengrass_provisioning_hooks: teardown: gg.deleteGroup: err:${err}`);
        }
    }

    // IoT cleanup - delete things
    const thingNames = ['IntegrationTestGroup1-Device1','IntegrationTestGroup1-Core'];
    for(const tn of thingNames) {
        try {
            // logger.debug(`\ngreengrass_provisioning_hooks: teardown: deleteThing: ${tn}`);
            await thingsSvc.deleteThing(tn, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
        } catch (err) {
            // swallow error
            // logger.error(`\ngreengrass_provisioning_hooks: teardown: deleteThing: err:${err}`);
        }
    }

    // IoT cleanup - delete thing types
    const thingTypes = ['IntegrationTestCore','IntegrationTestDevice'];
    for(const tt of thingTypes) {
        try {
            // logger.debug(`\ngreengrass_provisioning_hooks: teardown: deleteThingType: ${tt}`);
            await iot.deleteThingType({
                thingTypeName:tt
            }).promise()
        } catch (err) {
            // swallow error
            // logger.error(`\ngreengrass_provisioning_hooks: teardown: deleteThingType: err:${err}`);
        }
    }

    // CDF cleanup - delete groups
    const groupNames = ['IntegrationTestGroup1','IntegrationTestGroup2'];
    for(const n of groupNames) {
        try {
            // logger.debug(`\ngreengrass_provisioning_hooks: teardown: groupsSvc.deleteGroupByName: ${n}`);
            await groupsSvc.deleteGroupByName(n, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
        } catch (err) {
            // swallow the error
            // logger.error(`\ngreengrass_provisioning_hooks: teardown: groupsSvc.deleteGroupByName: err:${err}`);
        }
    }

    // CDF cleanup - delete templates
    const templateNames = ['IntegrationTestTemplate'];
    for(const n of templateNames) {
        try {
            // logger.debug(`\ngreengrass_provisioning_hooks: teardown: templatesSvc.deleteTemplate: ${n}`);
            await templatesSvc.deleteTemplate(n, getAdditionalHeaders(world[AUTHORIZATION_TOKEN]));
        } catch (err) {
            // swallow the error
            // logger.error(`\ngreengrass_provisioning_hooks: teardown: templatesSvc.deleteTemplate: err:${err}`);
        }
    }
    // logger.debug(`\ngreengrass_provisioning_hooks: teardown: exit:`);

}

Before({tags: '@setup_greengrass_provisioning'}, async function () {
    // logger.debug(`\ngreengrass_provisioning_hooks: @setup_greengrass_provisioning: in:`);
    await teardown(this);

    // create the provisioning template
    const integrationTestTemplate = {
        Parameters: {
            ThingName: {
                Type: "String"
            },
            ThingType: {
                Type: "String"
            },
            CertificatePem: {
                Type: "String"
            },
            CaCertificatePem: {
                Type: "String"
            }
        },
        Resources: {
            thing: {
                Type: "AWS::IoT::Thing",
                Properties: {
                    ThingName: {
                        Ref: "ThingName"
                    },
                    ThingTypeName: {
                        Ref: "ThingType"
                    }
                },
                OverrideSettings: {
                    ThingTypeName: "REPLACE"
                }
            },
            certificate: {
                Type: "AWS::IoT::Certificate",
                Properties: {
                    CACertificatePem: {
                        Ref: "CaCertificatePem"
                    },
                    CertificatePem: {
                        Ref: "CertificatePem"
                    },
                    Status: "ACTIVE"
                },
                OverrideSettings: {
                    Status: "REPLACE"
                }
            },
            policy: {
                Type: "AWS::IoT::Policy",
                Properties: {
                    PolicyName: "CDFGreengrassCorePolicy"
                }
            }
        },
        CDF: {
            createDeviceCertificate: true
        }
    };

    // create the thing types
    const thingTypes = ['IntegrationTestCore','IntegrationTestDevice'];
    for(const tt of thingTypes) {
        try {
            await iot.createThingType({thingTypeName:tt}).promise()
        } catch (err) {
            // swallow error
        }
    }

    // upload to S3
    const putObjectRequest = {
        Bucket: templateBucket,
        Key: `${templatePrefix}GreengrassIntegrationTestTemplate.json`,
        Body: JSON.stringify(integrationTestTemplate)
    };
    await s3.putObject(putObjectRequest).promise();
    // logger.debug(`\ngreengrass_provisioning_hooks: @setup_greengrass_provisioning: exit:`);
});

Before({tags: '@teardown_greengrass_provisioning'}, async function () {
    // logger.debug(`\ngreengrass_provisioning_hooks: @teardown_greengrass_provisioning: in:`);
    await teardown(this);
    // logger.debug(`\ngreengrass_provisioning_hooks: @teardown_greengrass_provisioning: exit:`);
});
