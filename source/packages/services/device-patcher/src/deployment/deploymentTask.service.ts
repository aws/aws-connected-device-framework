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
import {v1 as uuid} from 'uuid';
import {inject, injectable} from 'inversify';

import {TYPES} from '../di/types';
import {logger} from '../utils/logger.util';

import {DeploymentListPaginationKey, DeploymentTaskDao } from './deploymentTask.dao';

import {
    DeploymentTaskItem,
} from './deploymentTask.model';

import {DeploymentService} from './deployment.service';
import {DeploymentItem} from './deployment.model';

@injectable()
export class DeploymentTaskService {

    constructor(
        @inject(TYPES.DeploymentTaskDao) private deploymentTaskDao: DeploymentTaskDao,
        @inject(TYPES.DeploymentService) private deploymentService: DeploymentService
    ) {}

    public async create(task: DeploymentTaskItem): Promise<DeploymentTaskItem> {
        logger.debug(`DeploymentTaskService.create: in: deploymentTask: ${JSON.stringify(task)}`);

        ow(task, 'Deployment Information', ow.object.nonEmpty);
        ow(task.deployments, ow.array.nonEmpty);

        task.taskId = uuid();
        task.createdAt = new Date();
        task.updatedAt = task.createdAt;

        
        task.deployments.forEach( deployment => deployment.taskId = task.taskId);

        await this.deploymentTaskDao.save(task);

        await this.deploymentService.createBulk(task.deployments);

        logger.debug(`DeploymentTaskService.createDeployment out: result: ${JSON.stringify(task)}`);

        return task;
    }

    public async get(taskId: string): Promise<DeploymentTaskItem> {
        logger.debug(`DeploymentTaskService getDeploymentTask: in: taskId: ${taskId}`);

        ow(taskId, 'Deployment Id', ow.string.nonEmpty);

        const task = await this.deploymentTaskDao.get(taskId);

        if (!task) {
           throw new Error("NOT_FOUND");
        }

        logger.debug(`deployment.service getDeploymentTask: exit: deployment: ${JSON.stringify(task)}`);
        return task;
    }

    public async getDeployments(taskId: string, count?:number, exclusiveStartKey?:DeploymentListPaginationKey): Promise<[DeploymentItem[], DeploymentListPaginationKey]> {
        logger.debug(`DeploymentTaskService getDeployments: in: taskId: ${taskId}`);

        ow(taskId, 'Deployment Id', ow.string.nonEmpty);

        if (count) {
            count = Number(count);
        }
        // check if task exists
        await this.get(taskId);

        const result = await this.deploymentTaskDao.getDeployments(taskId, count, exclusiveStartKey);

        logger.debug(`deployment.service getDeployments: exit: deployments: ${JSON.stringify(result)}`);

        return result;

    }

}
