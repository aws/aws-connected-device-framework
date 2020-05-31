/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { setDefaultTimeout, When, TableDefinition, Then, Given} from 'cucumber';
import {CommandsService, CommandModel, COMMANDS_CLIENT_TYPES} from '@cdf/commands-client';
import stringify from 'json-stable-stringify';
import {RESPONSE_STATUS, replaceTokens, AUTHORIZATION_TOKEN} from '../common/common.steps';
import AWS = require('aws-sdk');
import config from 'config';
import {container} from '../../di/inversify.config';
import {Dictionary} from '../../../../libraries/core/lambda-invoke/src';

export const COMMAND_ID = 'commandId';
export const COMMAND_DETAILS = 'commandDetails';
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const commandsService:CommandsService = container.get(COMMANDS_CLIENT_TYPES.CommandsService);
function getAdditionalHeaders(world:any) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

const iot: AWS.Iot = new AWS.Iot({region: config.get('aws.region')});

function buildCommandModel(data:TableDefinition) {
    const d = data.rowsHash();

    const command = { } as CommandModel;

    Object.keys(d).forEach( key => {
        const value = replaceTokens(d[key]);
        if (value.startsWith('{') || value.startsWith('[')) {
            command[key] = JSON.parse(value);
        } else if (value==='___null___') {
            command[key] = null;
        } else if (value==='___undefined___') {
            delete command[key];
        } else {
            command[key] = value;
        }
    });

    return command;
}

async function createCommand (world:any, data:TableDefinition) {
    const command = buildCommandModel(data);
    return await commandsService.createCommand(command, getAdditionalHeaders(world));
}

async function updateCommand (world:any, commandId:string, data:TableDefinition) {
    const command = buildCommandModel(data);
    command.commandId = commandId;
    return await commandsService.updateCommand(command, getAdditionalHeaders(world));
}

Given('last command exists', async function () {
    this[RESPONSE_STATUS]=null;
    this[COMMAND_DETAILS]=null;
    const commandId = this[COMMAND_ID];

    expect(commandId).exist.and.length(36);

    try {
        const r = await commandsService.getCommand(commandId, getAdditionalHeaders(this));
        expect(commandId).equals(r.commandId);
        this[COMMAND_DETAILS]=r;
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }

});

When('I create a command with attributes', async function (data:TableDefinition) {
    this[COMMAND_ID]=null;
    this[RESPONSE_STATUS]=null;
    try {
        this[COMMAND_ID]=await createCommand(this, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I update last command with attributes', async function (data:TableDefinition) {
    this[RESPONSE_STATUS]=null;

    const commandId = this[COMMAND_ID];

    try {
        await updateCommand(this, commandId, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I upload file {string} to last command as file alias {string}', async function (testResource:string, alias:string) {
    this[RESPONSE_STATUS]=null;
    const commandId = this[COMMAND_ID];

    const fileLocation = `${__dirname}/../../../../src/testResources/${testResource}`;

    await commandsService.uploadCommandFile(commandId, alias, fileLocation, getAdditionalHeaders(this));

});

Then('last command exists with attributes', async function (data:TableDefinition) {
    this[RESPONSE_STATUS]=null;
    this[COMMAND_DETAILS]=null;
    const commandId = this[COMMAND_ID];

    const d = data.rowsHash();
    let r:CommandModel;
    try {
        r = await commandsService.getCommand(commandId, getAdditionalHeaders(this));
        expect(commandId).equals(r.commandId);
        this[COMMAND_DETAILS]=r;
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }

    Object.keys(d).forEach( key => {
        const val = replaceTokens(d[key]);
        if (val.startsWith('{') || val.startsWith('[')) {
            expect(stringify(r[key])).eq( stringify(JSON.parse(val)));
        } else if (val==='___null___') {
            expect(r[key]).eq(null);
        } else if (val==='___undefined___') {
            expect(r[key]).eq(undefined);
        } else if (val==='___any___') {
            expect(r[key]!==undefined).eq(true);
        } else {
            expect(r[key]).eq( val);
        }
    });

});

Then('last command has a file uploaded as file alias {string}', async function (alias:string) {
    const command:CommandModel = this[COMMAND_DETAILS];

    // tslint:disable-next-line:no-unused-expression
    expect(command.files[alias]).exist;

});

Then('job for last command exists', async function () {
    this[RESPONSE_STATUS]=null;
    const commandId = this[COMMAND_ID];
    expect(commandId).exist.and.length(36);

    let command:CommandModel;
    try {
        command = await commandsService.getCommand(commandId, getAdditionalHeaders(this));
        expect(commandId).equals(command.commandId);
        this[COMMAND_DETAILS]=command;

        const job = await iot.describeJob({jobId:command.jobId}).promise();
        expect(command.jobId).equals(job.job.jobId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }

});
