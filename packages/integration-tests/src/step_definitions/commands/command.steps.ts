/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { Before, setDefaultTimeout, When, TableDefinition, Then, Given} from 'cucumber';
import { CommandsService, CommandModel } from '@cdf/commands-client/dist';
import stringify from 'json-stable-stringify';
import { RESPONSE_STATUS, replaceTokens } from '../common/common.steps';
import AWS = require('aws-sdk');
import config from 'config';

export const COMMAND_ID = 'commandId';
export const COMMAND_DETAILS = 'commandDetails';

setDefaultTimeout(10 * 1000);

let commands: CommandsService;
let iot: AWS.Iot;

Before(function () {
    commands = new CommandsService();
    iot = new AWS.Iot({region: config.get('aws.region')});
});

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

async function createCommand (data:TableDefinition) {
    const command = buildCommandModel(data);
    return await commands.createCommand(command);
}

async function updateCommand (commandId:string, data:TableDefinition) {
    const command = buildCommandModel(data);
    command.commandId = commandId;
    return await commands.updateCommand(command);
}

Given('last command exists', async function () {
    this[RESPONSE_STATUS]=null;
    this[COMMAND_DETAILS]=null;
    const commandId = this[COMMAND_ID];

    expect(commandId).exist.and.length(36);

    try {
        const r = await commands.getCommand(commandId);
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
        this[COMMAND_ID]=await createCommand(data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I update last command with attributes', async function (data:TableDefinition) {
    this[RESPONSE_STATUS]=null;

    const commandId = this[COMMAND_ID];

    try {
        await updateCommand(commandId, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I upload file {string} to last command as file alias {string}', async function (testResource:string, alias:string) {
    this[RESPONSE_STATUS]=null;
    const commandId = this[COMMAND_ID];

    const fileLocation = `${__dirname}/../../../../../src/testResources/${testResource}`;

    await commands.uploadCommandFile(commandId, alias, fileLocation);

});

Then('last command exists with attributes', async function (data:TableDefinition) {
    this[RESPONSE_STATUS]=null;
    this[COMMAND_DETAILS]=null;
    const commandId = this[COMMAND_ID];

    const d = data.rowsHash();
    let r:CommandModel;
    try {
        r = await commands.getCommand(commandId);
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
        command = await commands.getCommand(commandId);
        expect(commandId).equals(command.commandId);
        this[COMMAND_DETAILS]=command;

        const job = await iot.describeJob({jobId:command.jobId}).promise();
        expect(command.jobId).equals(job.job.jobId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }

});
