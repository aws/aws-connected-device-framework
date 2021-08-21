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
