/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/* tslint:disable:no-unused-variable member-ordering */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { GroupTaskItem, GroupTaskSummary } from './groupTasks.model';
import { GroupTasksService, GroupTasksServiceBase } from './groupTasks.service';

@injectable()
export class GroupTasksApigwService extends GroupTasksServiceBase implements GroupTasksService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassProvisioning.baseUrl') as string;
    }

    async createGroupTask(groups:GroupTaskItem[], additionalHeaders?:RequestHeaders) : Promise<GroupTaskSummary> {
        ow(groups, ow.object.nonEmpty);
        const url = `${this.baseUrl}${super.groupTasksRelativeUrl()}`;
        const res = await request.post(url)
            .send({groups})
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async updateGroupTask(groups:GroupTaskItem[], additionalHeaders?:RequestHeaders) : Promise<GroupTaskSummary> {
        ow(groups, ow.object.nonEmpty);
        const url = `${this.baseUrl}${super.groupTasksRelativeUrl()}`;
        const res = await request.put(url)
            .send({groups})
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getGroupTask(taskId:string, additionalHeaders?:RequestHeaders) : Promise<GroupTaskSummary> {
        ow(taskId, ow.string.nonEmpty);
        const url = `${this.baseUrl}${super.groupTaskRelativeUrl(taskId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

}
