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
    interfaces, queryParam,
    requestBody,
    requestParam,
    response
} from 'inversify-express-utils';

import {handleError} from '../utils/errors';
import {logger} from '../utils/logger.util';

import {TYPES} from '../di/types';

import {DeploymentTaskService} from './deploymentTask.service';
import { DeploymentTaskAssembler } from './deploymentTask.assembler';
import {DeploymentTaskResource} from './deploymentTask.model';
import {DeploymentAssembler} from './deployment.assembler';


@controller('/deploymentTasks')
export class DeploymentTaskController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.DeploymentTaskService) private deploymentTaskService: DeploymentTaskService,
        @inject(TYPES.DeploymentTaskAssembler) private deploymentTaskAssembler: DeploymentTaskAssembler,
        @inject(TYPES.DeploymentAssembler) private deploymentAssembler: DeploymentAssembler
    ) {}

    @httpPost('')
    public async createDeploymentTask(
        @requestBody() resource: DeploymentTaskResource,
        @response() res: Response
    ): Promise<void> {
        logger.debug(`DeploymentTask.controller createDeploymentTask(): deploymentRequest:${JSON.stringify(resource)}`);

        try {
            const item = this.deploymentTaskAssembler.toItem(resource)
            const deployment = await this.deploymentTaskService.create(item);

            res.location(`/deploymentTasks/${deployment.taskId}`)
                .header('x-deploymentTaskId', deployment.taskId)
                .status(202)
                .send();

        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`DeploymentTask.controller createDeploymentTask: exit:`);
    }

    @httpGet('/:taskId')
    public async getDeploymentTask(
        @response() res: Response,
        @requestParam('taskId') taskId: string,
    ): Promise<DeploymentTaskResource> {
        logger.debug(`DeploymentTask.controller getDeploymentTask: in: taskId: ${taskId}`);

        let deploymentTask: DeploymentTaskResource;

        try {
            deploymentTask = await this.deploymentTaskService.get(taskId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`DeploymentTask.controller getDeploymentTask: exit: ${JSON.stringify(deploymentTask)}`);

        return deploymentTask;

    }

    @httpGet('/:taskId/deployments')
    public async getDeployments(
        @response() res: Response,
        @requestParam('taskId') taskId: string,
        @queryParam('count') count: number,
        @queryParam('exclusiveStartToken') exclusiveStartToken: string,
    ): Promise<void> {
        logger.debug(`DeploymentTask.controller getDeploymentTask: in: taskId: ${taskId}`);

        try {
            const [items, paginationKey] = await this.deploymentTaskService.getDeployments(taskId, count, {nextToken: exclusiveStartToken});
            const resources = this.deploymentAssembler.toListResource(items, count, paginationKey);

            logger.debug(`DeploymentTask.controller getDeployments: exit: ${JSON.stringify(resources)}`);

            res.status(200).send(resources);
        } catch (err) {
            handleError(err, res);
        }

    }

}
