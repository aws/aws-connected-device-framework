/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
