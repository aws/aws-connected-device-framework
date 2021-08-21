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
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {handleError} from '../utils/errors';
import { TYPES } from '../di/types';
import { DeploymentTaskSummary, DeploymentItemList } from './deployments.models';
import { DeploymentsService } from './deployments.service';

@controller('/deploymentTasks')
export class DeploymentsController implements interfaces.Controller {

    constructor( @inject(TYPES.DeploymentsService) private deploymentsService: DeploymentsService) {}
        // @inject(TYPES.DeploymentsAssembler) private deploymentsAssembler: DeploymentsAssembler

    @httpPost('')
    public async createDeploymentTask(@requestBody() req:DeploymentItemList, @response() res:Response) : Promise<DeploymentTaskSummary> {
        logger.info(`deployments.controller createDeploymentTask: in: deployments:${JSON.stringify(req)}`);

        let taskSummary:DeploymentTaskSummary;

        try {
            // const items = this.deploymentsAssembler.fromResourceList(deployments);
            taskSummary = await this.deploymentsService.createDeploymentTask(req.deployments);

            res.location(`/deploymentTasks/${taskSummary.taskId}`);
            res.status(202);

        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`deployments.controller createDeploymentTask: exit: ${JSON.stringify(taskSummary)}`);
        return taskSummary;
    }

    @httpGet('/:id')
    public async getDeploymentTask(@requestParam('id') id: string, @response() res:Response) : Promise<DeploymentTaskSummary> {
        logger.info(`deployments.controller getDeploymentTask: in: id:${id}`);

        let taskSummary:DeploymentTaskSummary;

        try {
            taskSummary = await this.deploymentsService.getDeploymentTask(id);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`deployments.controller getDeploymentTask: exit: ${JSON.stringify(taskSummary)}`);
        return taskSummary;
    }

}
