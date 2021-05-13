/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { Before, Given, setDefaultTimeout, TableDefinition, Then, When } from 'cucumber';
import config from 'config';
import AWS = require('aws-sdk');
import chai_string = require('chai-string');
import { fail } from 'assert';
import { expect, use } from 'chai';
import { replaceTokens, validateExpectedAttributes } from '../common/common.steps';
import { GREENGRASS_PROVISIONING_CLIENT_TYPES, GroupsService } from '@cdf/greengrass-provisioning-client/dist';
import {container} from '../../di/inversify.config';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { world } from './greengrass.world';
import { String } from 'aws-sdk/clients/apigateway';

use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

let gg: AWS.Greengrass;
const groupsService: GroupsService = container.get(GREENGRASS_PROVISIONING_CLIENT_TYPES.GroupsService);

Before(function () {
    gg = new AWS.Greengrass({region: config.get('aws.region')});
});

Given('greengrass group {string} exists', async function (name:string) {
    const ggDef = await getGgDef(name);
    expect(ggDef.Name).eq(name);
});

When('I create greengrass group {string} with attributes:', async function (name:string, data:TableDefinition) {
   const d = data.rowsHash();
    delete world.errStatus;

    let functionDefinitionVersionArn:string;
    if (d['functions']) {
        const functions = JSON.parse(replaceTokens(d['functions']));
        const req:AWS.Greengrass.Types.CreateFunctionDefinitionRequest = {
            InitialVersion: {
                Functions: functions
            }
        };
        try {
            // logger.debug(`greengrass-groups: createFunctionDefinition: req: ${JSON.stringify(req)}`);
            const res = await gg.createFunctionDefinition(req).promise();
            // logger.debug(`greengrass-groups: createFunctionDefinition: res: ${JSON.stringify(res)}`);
            functionDefinitionVersionArn = res.LatestVersionArn;
        } catch (err) {
            world.errStatus=err.status;
            fail(`createFunctionDefinition failed: ${JSON.stringify(err)}`);
        }
    }

    let subscriptionDefinitionVersionArn:string;
    if (d['subscriptions']) {
        const subscriptions = JSON.parse(replaceTokens(d['subscriptions']));
        const req:AWS.Greengrass.Types.CreateSubscriptionDefinitionRequest= {
            InitialVersion: {
                Subscriptions: subscriptions
            }
        };
        try {
            // logger.debug(`greengrass-groups: createSubscriptionDefinition: req: ${JSON.stringify(req)}`);
            const res = await gg.createSubscriptionDefinition(req).promise();
            // logger.debug(`greengrass-groups: createSubscriptionDefinition: res: ${JSON.stringify(res)}`);
            subscriptionDefinitionVersionArn = res.LatestVersionArn;
        } catch (err) {
            world.errStatus=err.status;
            fail(`createSubscriptionDefinition failed: ${JSON.stringify(err)}`);
        }
    }
    
    const req:AWS.Greengrass.Types.CreateGroupRequest = {
        Name: name,
        InitialVersion: {
            FunctionDefinitionVersionArn: functionDefinitionVersionArn,
            SubscriptionDefinitionVersionArn: subscriptionDefinitionVersionArn
        }
    };
    try {
        // logger.debug(`greengrass-groups: createGroup: req: ${JSON.stringify(req)}`);
        const res = await gg.createGroup(req).promise();
        // logger.debug(`greengrass-groups: createGroup: res: ${JSON.stringify(res)}`);
        world.groupNameToIds[name] = {
            groupId:res.Id,
            versionId: res.LatestVersion
        };
        // as we are using this as map, 
    } catch (err) {
        world.errStatus=err.status;
        fail(`createGroup failed: ${JSON.stringify(err)}`);
    }
});

When('I update greengrass group {string} with attributes:', async function (name:string, data:TableDefinition) {
    const d = data.rowsHash();
    delete world.errStatus;

    if (d['connectors']) {
        fail('updating connectors not implemented as part of the test yet');
    }
    if (d['cores']) {
        fail('updating cores not supported in this test');
    }
    if (d['devices']) {
        fail('updating devices not supported in this test');
    }
    if (d['logger']) {
        fail('updating logger not implemented as part of the test yet');
    }
    if (d['resources']) {
        fail('updating resources not implemented as part of the test yet');
    }

    // load the group from cdf in order to find its id
    const ggVersionDef = await getGgDefVersion(name);

    let functionDefinitionVersionArn = ggVersionDef.Definition.FunctionDefinitionVersionArn;
    if (d['functions']) {
        const functions = JSON.parse(replaceTokens(d['functions']));
        const req:AWS.Greengrass.Types.CreateFunctionDefinitionRequest = {
            InitialVersion: {
                Functions: functions
            }
        };
        try {
            // logger.debug(`greengrass-groups: createFunctionDefinition: req: ${JSON.stringify(req)}`);
            const res = await gg.createFunctionDefinition(req).promise();
            // logger.debug(`greengrass-groups: createFunctionDefinition: res: ${JSON.stringify(res)}`);
            functionDefinitionVersionArn = res.LatestVersionArn;
        } catch (err) {
            world.errStatus=err.status;
            fail(`createFunctionDefinition failed: ${JSON.stringify(err)}`);
        }
    }

    let subscriptionDefinitionVersionArn = ggVersionDef.Definition.SubscriptionDefinitionVersionArn;
    if (d['subscriptions']) {
        const subscriptions = JSON.parse(replaceTokens(d['subscriptions']));
        const req:AWS.Greengrass.Types.CreateSubscriptionDefinitionRequest= {
            InitialVersion: {
                Subscriptions: subscriptions
            }
        };
        try {
            // logger.debug(`greengrass-groups: createSubscriptionDefinition: req: ${JSON.stringify(req)}`);
            const res = await gg.createSubscriptionDefinition(req).promise();
            // logger.debug(`greengrass-groups: createSubscriptionDefinition: res: ${JSON.stringify(res)}`);
            subscriptionDefinitionVersionArn = res.LatestVersionArn;
        } catch (err) {
            world.errStatus=err.status;
            fail(`createSubscriptionDefinition failed: ${JSON.stringify(err)}`);
        }
    }
    
    const req:AWS.Greengrass.Types.CreateGroupVersionRequest = {
        GroupId: ggVersionDef.Id,
        ConnectorDefinitionVersionArn: ggVersionDef.Definition.ConnectorDefinitionVersionArn,
        CoreDefinitionVersionArn: ggVersionDef.Definition.CoreDefinitionVersionArn,
        DeviceDefinitionVersionArn: ggVersionDef.Definition.DeviceDefinitionVersionArn,
        FunctionDefinitionVersionArn: functionDefinitionVersionArn ?? ggVersionDef.Definition.FunctionDefinitionVersionArn,
        LoggerDefinitionVersionArn: ggVersionDef.Definition.LoggerDefinitionVersionArn,
        ResourceDefinitionVersionArn: ggVersionDef.Definition.ResourceDefinitionVersionArn,
        SubscriptionDefinitionVersionArn: subscriptionDefinitionVersionArn ?? ggVersionDef.Definition.SubscriptionDefinitionVersionArn
    };
    try {
        // logger.debug(`greengrass-groups: createGroupVersion: req: ${JSON.stringify(req)}`);
        const res = await gg.createGroupVersion(req).promise();
        // logger.debug(`greengrass-groups: createGroupVersion: res: ${JSON.stringify(res)}`);
        world.groupNameToIds[name].versionId=res.Version;
    } catch (err) {
        world.errStatus=err.status;
        fail(`createGroupVersion failed: ${JSON.stringify(err)}`);
    }

});

Then('greengrass group {string} exists with attributes:', async function (name:string, data:TableDefinition) {
    const ggDef = await getGgDef(name);
    validateExpectedAttributes(ggDef, data);
});

Then('greengrass group {string} function definition exists with attributes:', async function (name:string, data:TableDefinition) {
    // get the group version def
    const ggVersionDef = await getGgDefVersion(name);

    // get the function def
    const arn = ggVersionDef.Definition.FunctionDefinitionVersionArn;
    const [defId, versionId] = extractDefIdVersionFromArn(arn);
    const ggFunctionVersionDef = await gg.getFunctionDefinitionVersion({
        FunctionDefinitionId: defId,
        FunctionDefinitionVersionId: versionId
    }).promise();

    validateExpectedAttributes(ggFunctionVersionDef, data);
});

Then('greengrass group {string} subscription definition exists with attributes:', async function (name:string, data:TableDefinition) {
    // get the group version def
    const ggVersionDef = await getGgDefVersion(name);

    // get the subscription def
    const arn = ggVersionDef.Definition.SubscriptionDefinitionVersionArn;
    const [defId, versionId] = extractDefIdVersionFromArn(arn);
    const ggSubscriptionVersionDef = await gg.getSubscriptionDefinitionVersion({
        SubscriptionDefinitionId: defId,
        SubscriptionDefinitionVersionId: versionId
    }).promise();

    validateExpectedAttributes(ggSubscriptionVersionDef, data);
});

Then('greengrass group {string} core definition exists with attributes:', async function (name:string, data:TableDefinition) {
    // get the group version def
    const ggVersionDef = await getGgDefVersion(name);

    // get the core def
    const arn = ggVersionDef.Definition.CoreDefinitionVersionArn;
    const [defId, versionId] = extractDefIdVersionFromArn(arn);
    const ggCoreVersionDef = await gg.getCoreDefinitionVersion({
        CoreDefinitionId: defId,
        CoreDefinitionVersionId: versionId
    }).promise();;

    validateExpectedAttributes(ggCoreVersionDef, data);
});

Then('greengrass group {string} device definition exists with attributes:', async function (name:string, data:TableDefinition) {
    // get the group version def
    const ggVersionDef = await getGgDefVersion(name);

    // get the device def
    const arn = ggVersionDef.Definition.DeviceDefinitionVersionArn;
    const [defId, versionId] = extractDefIdVersionFromArn(arn);
    const ggDeviceVersionDef = await gg.getDeviceDefinitionVersion({
        DeviceDefinitionId: defId,
        DeviceDefinitionVersionId: versionId
    }).promise();

    validateExpectedAttributes(ggDeviceVersionDef, data);
});

async function getGgDef(name:String) : Promise<AWS.Greengrass.GetGroupResponse> {

    let groupId:string;

    try {
        // load the group from cdf in order to find its id
        const group = await groupsService.getGroupByName(name, getAdditionalHeaders(world.authToken));
        groupId = group?.id;
    } catch (err) {
        // swallow
    }

    // if that fails see if we have it tracked in world
    if (groupId===undefined) {
        groupId = world.groupNameToIds[name].groupId;
    }
    expect(groupId, 'groupId').not.undefined;

    // load the group from aws iot
    const ggDef = await gg.getGroup({
        GroupId: groupId
    }).promise();

    return ggDef;

}

async function getGgDefVersion(name:string) : Promise<AWS.Greengrass.GetGroupVersionResponse> {
    const ggDef = await getGgDef(name);

    // get the group version def
    const ggVersionDef = await gg.getGroupVersion({
        GroupId: ggDef.Id,
        GroupVersionId: ggDef.LatestVersion
    }).promise();

    return ggVersionDef;

}

function extractDefIdVersionFromArn(arn:string) : [string,string] {
    const resource = arn.substring( arn.lastIndexOf(':'));
    const components = resource.split('/');

    const defId = components[components.length-3];
    const versionId =  components[components.length-1];

    return [defId, versionId];
}