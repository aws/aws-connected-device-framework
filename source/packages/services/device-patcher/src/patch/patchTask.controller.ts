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
import { handleError } from '../utils/errors';

import { TYPES } from '../di/types';

import { PatchAssembler } from './patch.assembler';
import { PatchTaskAssembler } from './patchTask.assembler';
import { PatchTaskResource } from './patchTask.model';
import { PatchTaskService } from './patchTask.service';

@controller('/patchTasks')
export class PatchTaskController implements interfaces.Controller {
    public constructor(
        @inject(TYPES.PatchTaskService) private patchTaskService: PatchTaskService,
        @inject(TYPES.PatchTaskAssembler) private patchTaskAssembler: PatchTaskAssembler,
        @inject(TYPES.PatchAssembler) private patchAssembler: PatchAssembler,
    ) {}

    @httpPost('')
    public async createPatchTask(
        @requestBody() resource: PatchTaskResource,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `PatchTask.controller createPatchTask(): patchRequest:${JSON.stringify(resource)}`,
        );

        try {
            const item = this.patchTaskAssembler.toItem(resource);
            const patch = await this.patchTaskService.create(item);

            res.location(`/patchTasks/${patch.taskId}`)
                .header('x-taskId', patch.taskId)
                .status(202)
                .send();
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`PatchTask.controller createPatchTask: exit:`);
    }

    @httpGet('/:taskId')
    public async getPatchTask(
        @response() res: Response,
        @requestParam('taskId') taskId: string,
    ): Promise<PatchTaskResource> {
        logger.debug(`PatchTask.controller getPatchTask: in: taskId: ${taskId}`);

        let patchTask: PatchTaskResource;

        try {
            patchTask = await this.patchTaskService.get(taskId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`PatchTask.controller getPatchTask: exit: ${JSON.stringify(patchTask)}`);

        return patchTask;
    }

    @httpGet('/:taskId/patches')
    public async getPatchs(
        @response() res: Response,
        @requestParam('taskId') taskId: string,
        @queryParam('count') count: number,
        @queryParam('exclusiveStartToken') exclusiveStartToken: string,
    ): Promise<void> {
        logger.debug(`PatchTask.controller getPatchTask: in: taskId: ${taskId}`);

        try {
            const [items, paginationKey] = await this.patchTaskService.getPatches(taskId, count, {
                nextToken: exclusiveStartToken,
            });
            const resources = this.patchAssembler.toListResource(items, count, paginationKey);

            logger.debug(`PatchTask.controller getPatches: exit: ${JSON.stringify(resources)}`);

            res.status(200).send(resources);
        } catch (err) {
            handleError(err, res);
        }
    }
}
