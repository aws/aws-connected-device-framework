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
import 'reflect-metadata';

import { use, expect } from 'chai';
import { setDefaultTimeout, DataTable, Then, When, Given } from '@cucumber/cucumber';

import { container } from '../../di/inversify.config';
import { buildModel, validateExpectedAttributes } from '../common/common.steps';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { world } from './commandandcontrol.world';
import {
    COMMANDANDCONTROL_CLIENT_TYPES,
    CommandResource,
    CommandsService,
    CommandResourceList,
} from '@awssolutions/cdf-commandandcontrol-client';

import chai_string = require('chai-string');
use(chai_string);

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const commandsService: CommandsService = container.get(
    COMMANDANDCONTROL_CLIENT_TYPES.CommandsService
);

Given(
    'command-and-control command with operation {string} exists',
    async function (operation: string) {
        delete world.lastCommand;
        const commands = await listCommands();
        const command = commands.filter((c) => c.operation === operation)?.[0];
        expect(command).to.not.be.undefined;
        world.lastCommand = command;
    }
);

Given(
    'command-and-control command with operation {string} does not exist',
    async function (operation: string) {
        delete world.lastCommand;
        const commands = await listCommands();
        const command = commands.filter((c) => c.operation === operation)?.[0];
        expect(command).to.be.undefined;
    }
);

When('I create command-and-control command with attributes:', async function (data: DataTable) {
    delete world.lastCommand;
    const command: CommandResource = buildModel(data);
    world.lastCommand = command;
    world.lastCommand.id = await commandsService.createCommand(
        command,
        getAdditionalHeaders(world.authToken)
    );
});

When(
    'I create named command-and-control command with attributes:',
    async function (data: DataTable) {
        delete world.lastCommand;
        const command: CommandResource = buildModel(data);
        world.lastCommand = command;
        world.lastCommand.id = await commandsService.createNamedCommand(
            'test_name',
            command,
            getAdditionalHeaders(world.authToken)
        );
    }
);

Then('last command-and-control command exists with attributes:', async function (data: DataTable) {
    const command = await commandsService.getCommand(
        world.lastCommand.id,
        getAdditionalHeaders(world.authToken)
    );
    validateExpectedAttributes(command, data);
});

export async function listCommands(): Promise<CommandResource[]> {
    const commands: CommandResource[] = [];
    let r: CommandResourceList;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        r = await commandsService.listCommands(
            undefined,
            undefined,
            undefined,
            getAdditionalHeaders(world.authToken)
        );
        commands.push(...r.commands);
        if (r.pagination?.lastEvaluated?.commandId) {
            r = await commandsService.listCommands(
                undefined,
                r.pagination.lastEvaluated.commandId,
                undefined,
                getAdditionalHeaders(world.authToken)
            );
        } else {
            break;
        }
    }
    return commands;
}

Then('I have all commands restored', async (data: DataTable) => {
    const expectedCommandList = data.raw().flat();
    const commands = await listCommands();
    expect(commands.map((command) => command.operation)).to.have.same.members(expectedCommandList);
});
