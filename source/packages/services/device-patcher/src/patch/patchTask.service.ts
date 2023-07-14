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
import ow from 'ow';
import { v1 as uuid } from 'uuid';
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';

import { PatchListPaginationKey, PatchTaskDao } from './patchTask.dao';

import { PatchTaskItem } from './patchTask.model';

import { PatchService } from './patch.service';
import { PatchItem } from './patch.model';

@injectable()
export class PatchTaskService {
    constructor(
        @inject(TYPES.PatchTaskDao) private patchTaskDao: PatchTaskDao,
        @inject(TYPES.PatchService) private patchService: PatchService,
    ) {}

    public async create(task: PatchTaskItem): Promise<PatchTaskItem> {
        logger.debug(`PatchTaskService.create: in: patchTask: ${JSON.stringify(task)}`);

        ow(task, 'Patch Information', ow.object.nonEmpty);
        ow(task.patches, ow.array.nonEmpty);
        ow(task.patches, 'PatchTask.patches', ow.array.ofType(ow.object));

        // if any of the tasks have bad input, fail fast and do not save anything
        this.patchService.validate(task.patches);

        task.taskId = uuid();
        task.createdAt = new Date();
        task.updatedAt = task.createdAt;

        task.patches.forEach((patch) => (patch.taskId = task.taskId));

        await this.patchTaskDao.save(task);

        await this.patchService.createBulk(task.patches);

        logger.debug(`PatchTaskService.createPatch out: result: ${JSON.stringify(task)}`);

        return task;
    }

    public async get(taskId: string): Promise<PatchTaskItem> {
        logger.debug(`PatchTaskService getPatchTask: in: taskId: ${taskId}`);

        ow(taskId, 'Patch Id', ow.string.nonEmpty);

        const task = await this.patchTaskDao.get(taskId);

        if (!task) {
            throw new Error('NOT_FOUND');
        }

        logger.debug(`patch.service getPatchTask: exit: patch: ${JSON.stringify(task)}`);
        return task;
    }

    public async getPatches(
        taskId: string,
        count?: number,
        exclusiveStartKey?: PatchListPaginationKey,
    ): Promise<[PatchItem[], PatchListPaginationKey]> {
        logger.debug(`PatchTaskService getPatchs: in: taskId: ${taskId}`);

        ow(taskId, 'Patch Id', ow.string.nonEmpty);

        if (count) {
            count = Number(count);
        }
        // check if task exists
        await this.get(taskId);

        const result = await this.patchTaskDao.getPatchs(taskId, count, exclusiveStartKey);

        logger.debug(`patch.service getPatchs: exit: patchs: ${JSON.stringify(result)}`);

        return result;
    }
}
