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
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';

import { RequestHeaders } from './common.model';
import { DeploymentTask, NewDeploymentTask } from './deployments.model';
import { DeploymentsService, DeploymentsServiceBase } from './deployments.service';

@injectable()
export class DeploymentsApigwService extends DeploymentsServiceBase implements DeploymentsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = process.env.GREENGRASSPROVISIONING_BASE_URL;
    }

    async createDeploymentTask(task:NewDeploymentTask, additionalHeaders?:RequestHeaders) : Promise<string> {
        ow(task?.template?.name, 'template name', ow.string.nonEmpty);
        ow(task.targets, 'targets', ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentTasksRelativeUrl()}`;

        const r = await request.post(url)
            .send(task)
            .set(this.buildHeaders(additionalHeaders));
        return r.headers['x-taskid'];

    }

    async getDeploymentTask(taskId: string, additionalHeaders?:RequestHeaders) : Promise<DeploymentTask> {

        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentTaskRelativeUrl(taskId)}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;

    }

}
