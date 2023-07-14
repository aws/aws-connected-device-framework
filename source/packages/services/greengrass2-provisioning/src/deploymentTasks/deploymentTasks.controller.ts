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
import { Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpGet,
    httpPost,
    interfaces,
    queryParam,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';
import { Deployment } from '../deployments/deployments.models';

import { TYPES } from '../di/types';
import { handleError } from '../utils/errors.util';
import { logger } from '@awssolutions/simple-cdf-logger';
import {
    CoreDeploymentList,
    DeploymentTask,
    DeploymentTaskList,
    NewDeploymentTask,
} from './deploymentTasks.models';
import { DeploymentTasksService } from './deploymentTasks.service';

@controller('/deploymentTasks')
export class DeploymentTasksController implements interfaces.Controller {
    constructor(
        @inject(TYPES.DeploymentTasksService)
        private deploymentTasksService: DeploymentTasksService,
    ) {}

    @httpPost('')
    public async createDeploymentTask(
        @requestBody() task: NewDeploymentTask,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `deploymentTasks.controller createDeploymentTask: in: task: ${JSON.stringify(task)}`,
        );
        try {
            const taskId = await this.deploymentTasksService.create(task);
            res.location(`/deploymentTasks/${taskId}`)
                .header('x-taskid', taskId)
                .status(202)
                .send();
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`deploymentTasks.controller createDeploymentTask: exit:`);
    }

    @httpGet('/:taskId')
    public async getDeploymentTask(
        @requestParam('taskId') taskId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(`deploymentTasks.controller getDeploymentTask: in: taskId:${taskId}`);

        let result: DeploymentTask;
        try {
            result = await this.deploymentTasksService.get(taskId);
            if (result === undefined) {
                logger.debug(`deploymentTasks.controller getDeploymentTask: exit: 404`);
                res.status(404).send();
            } else {
                logger.debug(
                    `deploymentTasks.controller getDeploymentTask: exit: ${JSON.stringify(
                        result,
                    )}`,
                );
                res.status(200).send(result);
            }
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('')
    public async listDeploymentTasks(
        @queryParam('count') count: number,
        @queryParam('exclusiveStartTaskId') exclusiveStartTaskId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `deploymentTasks.controller listDeploymentTasks: in: count:${count}, exclusiveStartTaskId:${exclusiveStartTaskId}`,
        );

        let result: DeploymentTaskList;
        try {
            const [items, paginationKey] = await this.deploymentTasksService.list(count, {
                taskId: exclusiveStartTaskId,
            });

            result = {
                deploymentTasks: items,
                pagination: {
                    count,
                    lastEvaluated: paginationKey,
                },
            };
            logger.debug(
                `deploymentTasks.controller listDeploymentTasks: exit: ${JSON.stringify(result)}`,
            );
            res.status(200).send(result);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:taskId/cores/:coreName')
    public async getCoreDeploymentStatus(
        @requestParam('taskId') taskId: string,
        @requestParam('coreName') coreName: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `deploymentTasks.controller getCoreDeploymentStatus: in: taskId:${taskId}, coreName:${coreName}`,
        );

        let result: Deployment;
        try {
            result = await this.deploymentTasksService.getCoreDeploymentStatus(taskId, coreName);
            if (result === undefined) {
                logger.debug(`deploymentTasks.controller getCoreDeploymentStatus: exit: 404`);
                res.status(404).send();
            } else {
                logger.debug(
                    `deploymentTasks.controller getCoreDeploymentStatus: exit: ${JSON.stringify(
                        result,
                    )}`,
                );
                res.status(200).send(result);
            }
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:taskId/cores')
    public async listCoresByDeploymentTaskId(
        @requestParam('taskId') taskId: string,
        @queryParam('count') count: number,
        @queryParam('exclusiveStartThingName') exclusiveStartThingName: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `deploymentTasks.controller listCoresByDeploymentTaskId: in: count:${count}, exclusiveStartThingName:${exclusiveStartThingName}`,
        );

        let result: CoreDeploymentList;
        try {
            const [items, paginationKey] =
                await this.deploymentTasksService.listCoresByDeploymentTask(taskId, count, {
                    thingName: exclusiveStartThingName,
                });

            result = {
                cores: items,
                pagination: {
                    count,
                    lastEvaluated: paginationKey,
                },
            };
            logger.debug(
                `deploymentTasks.controller listCoresByDeploymentTaskId: exit: ${JSON.stringify(
                    result,
                )}`,
            );
            res.status(200).send(result);
        } catch (e) {
            handleError(e, res);
        }
    }
}
