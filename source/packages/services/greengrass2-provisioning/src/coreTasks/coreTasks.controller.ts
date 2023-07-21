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

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import { handleError } from '../utils/errors.util';
import { CoreTasksAssembler } from './coreTasks.assembler';
import { NewCoreTaskResource } from './coreTasks.models';
import { CoreTasksService } from './coreTasks.service';

@controller('/coreTasks')
export class CoreTasksController implements interfaces.Controller {
    constructor(
        @inject(TYPES.CoreTasksService) private coreTasksService: CoreTasksService,
        @inject(TYPES.CoreTasksAssembler) private coreTasksAssembler: CoreTasksAssembler
    ) {}

    @httpPost('')
    public async createCoreTask(
        @requestBody() resource: NewCoreTaskResource,
        @response() res: Response
    ): Promise<void> {
        logger.debug(
            `coreTasks.controller createCoreTask: in: resource: ${JSON.stringify(resource)}`
        );
        try {
            const item = this.coreTasksAssembler.toItem(resource);
            const taskId = await this.coreTasksService.create(item);
            logger.debug(
                `coreTasks.controller createCoreTask: exit: taskId:${JSON.stringify(taskId)}`
            );
            res.location(`/coreTasks/${taskId}`).header('x-taskid', taskId).status(202).send();
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:taskId')
    public async getCoreTask(
        @requestParam('taskId') taskId: string,
        @response() res: Response
    ): Promise<void> {
        logger.info(`coreTasks.controller getCoreTask: in: taskId:${taskId}`);

        try {
            const item = await this.coreTasksService.get(taskId);
            if (item === undefined) {
                logger.debug(`coreTasks.controller getCoreTask: exit: 404`);
                res.status(404).send();
            } else {
                const resource = this.coreTasksAssembler.toResource(item);
                logger.debug(
                    `coreTasks.controller getCoreTask: exit: ${JSON.stringify(resource)}`
                );
                res.status(200).send(resource);
            }
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('')
    public async listCoreTasks(
        @queryParam('count') count: number,
        @queryParam('exclusiveStartTaskId') exclusiveStartTaskId: string,
        @response() res: Response
    ): Promise<void> {
        logger.debug(
            `coreTasks.controller listCoreTasks: in: count:${count}, exclusiveStartTaskId:${exclusiveStartTaskId}`
        );

        try {
            const [items, paginationKey] = await this.coreTasksService.list(count, {
                taskId: exclusiveStartTaskId,
            });
            const resources = this.coreTasksAssembler.toListResource(items, count, paginationKey);
            logger.debug(`coreTasks.controller listCoreTasks: exit: ${JSON.stringify(resources)}`);
            res.status(200).send(resources);
        } catch (e) {
            handleError(e, res);
        }
    }
}
