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

import { DataTable, Then, When, setDefaultTimeout } from '@cucumber/cucumber';
import { expect, use } from 'chai';

import {
    COMMANDANDCONTROL_CLIENT_TYPES,
    MessageResource,
    MessagesService,
} from '@awssolutions/cdf-commandandcontrol-client';
import { container } from '../../di/inversify.config';
import { buildModel, validateExpectedAttributes } from '../common/common.steps';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { world } from './commandandcontrol.world';

import chai_string = require('chai-string');
use(chai_string);

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(20 * 1000);

const messagesService: MessagesService = container.get(
    COMMANDANDCONTROL_CLIENT_TYPES.MessagesService
);

When(
    'I send command-and-control message to last command with attributes:',
    async function (data: DataTable) {
        const message: MessageResource = buildModel(data);
        message.commandId = world.lastCommand.id;
        world.lastMessageId = await messagesService.createMessage(
            message,
            getAdditionalHeaders(world.authToken)
        );
    }
);

When(
    'I wait until last command-and-control message has {string} status',
    async function (status: string) {
        let message;
        try {
            message = await messagesService.getMessage(
                world.lastMessageId,
                getAdditionalHeaders(world.authToken)
            );
        } catch (err) {
            // ignore
        }
        const waitArray = new Int32Array(new SharedArrayBuffer(1024));
        while (message?.status !== status) {
            Atomics.wait(waitArray, 0, 0, 2000);
            try {
                message = await messagesService.getMessage(
                    world.lastMessageId,
                    getAdditionalHeaders(world.authToken)
                );
            } catch (err) {
                // ignore
            }
        }
        expect(message?.status).to.eq(status);
    }
);

Then('last command-and-control message exists with attributes:', async function (data: DataTable) {
    const message = await messagesService.getMessage(
        world.lastMessageId,
        getAdditionalHeaders(world.authToken)
    );
    validateExpectedAttributes(message, data, world);
});

Then('last command-and-control message has recipients:', async function (data: DataTable) {
    const recipients = await messagesService.listRecipients(
        world.lastMessageId,
        undefined,
        undefined,
        getAdditionalHeaders(world.authToken)
    );
    validateExpectedAttributes(recipients, data, world);
});
