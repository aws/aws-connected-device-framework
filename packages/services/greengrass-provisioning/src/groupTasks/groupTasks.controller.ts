/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam, httpPut } from 'inversify-express-utils';
import { inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {handleError} from '../utils/errors';
import { TYPES } from '../di/types';
import { GroupTasksAssembler } from './groupTasks.assembler';
import { GroupTasksService } from './groupTasks.service';
import { GroupResourceList } from '../groups/groups.models';
import { GroupTaskSummaryResource } from './groupTasks.models';

@controller('/groupTasks')
export class GroupTasksController implements interfaces.Controller {

    constructor( 
        @inject(TYPES.GroupTasksService) private groupTasksService: GroupTasksService,
        @inject(TYPES.GroupTasksAssembler) private groupTasksAssembler: GroupTasksAssembler) {}

    @httpPost('')
    public async createGroupTask(@requestBody() req:GroupResourceList, @response() res:Response) : Promise<GroupTaskSummaryResource> {
        logger.info(`groupTasks.controller createGroupTask: in: req:${JSON.stringify(req)}`);

        let result:GroupTaskSummaryResource;
        try {
            const item = await this.groupTasksService.createGroupsTask(req.groups, 'Create');
            result = this.groupTasksAssembler.toResource(item);
            res.status(202);
        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`groupTasks.controller createGroupTask: exit: ${JSON.stringify(result)}`);
        return result;
    }

    @httpPut('')
    public async updateGroupTask(@requestBody() req:GroupResourceList, @response() res:Response) : Promise<GroupTaskSummaryResource> {
        logger.info(`groupTasks.controller updateGroupTask: in: req:${JSON.stringify(req)}`);

        let result:GroupTaskSummaryResource;
        try {
            const item = await this.groupTasksService.createGroupsTask(req.groups, 'Update');
            result = this.groupTasksAssembler.toResource(item);
            res.status(202);
        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`groupTasks.controller updateGroupTask: exit: ${JSON.stringify(result)}`);
        return result;
    }

    @httpGet('/:taskId')
    public async getGroupTask(@requestParam('taskId') taskId:string, @response() res:Response) : Promise<GroupTaskSummaryResource> {
        logger.info(`groupTasks.controller getGroupTask: in: taskId:${taskId}`);

        let result: GroupTaskSummaryResource;
        try {
            const item = await this.groupTasksService.getGroupsTask(taskId);
            result = this.groupTasksAssembler.toResource(item);
            res.status(200);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`groupTasks.controller getGroupTask: exit: ${JSON.stringify(result)}`);
        return result;
    }

}
