/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { Given, setDefaultTimeout, TableDefinition, Then, When } from 'cucumber';
import chai_string = require('chai-string');
import { expect, use } from 'chai';
import {GREENGRASS_PROVISIONING_CLIENT_TYPES, GroupsService, GroupTaskItem, GroupTasksService, GroupTaskSummary} from '@cdf/greengrass-provisioning-client';
import {container} from '../../di/inversify.config';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { buildModel, validateExpectedAttributes } from '../common/common.steps';
import { fail } from 'assert';
import { world } from './greengrass.world';
use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const groupsService: GroupsService = container.get(GREENGRASS_PROVISIONING_CLIENT_TYPES.GroupsService);
const groupTasksService: GroupTasksService = container.get(GREENGRASS_PROVISIONING_CLIENT_TYPES.GroupTasksService);

Given('greengrass-provisioning group {string} does not exist', async function (groupName:string) {
    try {
        await groupsService.getGroupByName(groupName, getAdditionalHeaders(world.authToken));
        expect.fail('Not found should have be thrown');
    } catch (err) {
        expect(err.status).to.eq(404);
    }
});

Then('greengrass-provisioning group {string} exists', async function (groupName:string) {
    try {
        await groupsService.getGroupByName(groupName, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        expect.fail('Should have been found');
    }
  });

When('I create greengrass-provisioning group task with attributes:', async function (data:TableDefinition) {
    delete world.lastTaskId;
    try {
        const task:GroupTaskItem[] = buildModel(data)['groups'];
        const res = await groupTasksService.createGroupTask(task, getAdditionalHeaders(world.authToken));
        world.lastTaskId = res.taskId;
    } catch (err) {
        world.errStatus=err.status;
        fail(`createGroupTask failed, err: ${JSON.stringify(err)}`);
    }
});

When('I update greengrass-provisioning group task with attributes:', async function (data:TableDefinition) {
    delete world.lastTaskId
    try {
        const task:GroupTaskItem[] = buildModel(data)['groups'];
        const res = await groupTasksService.updateGroupTask(task, getAdditionalHeaders(world.authToken));
        world.lastTaskId = res.taskId;
    } catch (err) {
        world.errStatus=err.status;
        fail(`updateGroupTask failed, err: ${JSON.stringify(err)}`);
    }
});

Then('last greengrass-provisioning group task exists with attributes:', async function (data:TableDefinition) {
    let task:GroupTaskSummary;
    try {
        task = await groupTasksService.getGroupTask(world.lastTaskId, getAdditionalHeaders(world.authToken));
    } catch (err) {
        world.errStatus=err.status;
        fail(`getGroupTask failed, err: ${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(task, data);
});
