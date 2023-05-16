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
import { setDefaultTimeout, DataTable, Then, When } from '@cucumber/cucumber';
import chai_string = require('chai-string');
import { use } from 'chai';
import {
    GREENGRASS2_PROVISIONING_CLIENT_TYPES,
    NewDeploymentTask,
    DeploymentsService,
    DeploymentTask,
} from '@aws-solutions/cdf-greengrass2-provisioning-client';
import { container } from '../../di/inversify.config';
import { getAdditionalHeaders } from '../notifications/notifications.utils';
import { buildModel, validateExpectedAttributes } from '../common/common.steps';
import { fail } from 'assert';
import { world } from './greengrass2.world';
use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const deploymentsService: DeploymentsService = container.get(
    GREENGRASS2_PROVISIONING_CLIENT_TYPES.DeploymentsService
);

When(
    'I create greengrass2-provisioning deployment task with attributes:',
    async function (data: DataTable) {
        delete world.lastDeploymentTaskId;
        try {
            const task: NewDeploymentTask = buildModel(data);
            world.lastDeploymentTaskId = await deploymentsService.createDeploymentTask(
                task,
                getAdditionalHeaders(world.authToken)
            );
        } catch (err) {
            world.errStatus = err.status;
            fail(`createDeploymentTask failed, err: ${JSON.stringify(err)}`);
        }
    }
);

Then(
    'last greengrass2-provisioning deployment task exists with attributes:',
    async function (data: DataTable) {
        let task: DeploymentTask;
        try {
            task = await deploymentsService.getDeploymentTask(
                world.lastDeploymentTaskId,
                getAdditionalHeaders(world.authToken)
            );
        } catch (err) {
            world.errStatus = err.status;
            fail(`getDeploymentTask failed, err: ${JSON.stringify(err)}`);
        }
        validateExpectedAttributes(task, data);
    }
);
