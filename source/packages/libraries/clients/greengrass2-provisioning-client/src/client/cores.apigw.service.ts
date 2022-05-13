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
import { CoreList, DeploymentList } from '..';

import { RequestHeaders } from './common.model';
import { Core, CoreTask, NewCoreTask } from './cores.model';
import { CoresService, CoresServiceBase } from './cores.service';

@injectable()
export class CoresApigwService extends CoresServiceBase implements CoresService {

    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.GREENGRASS2PROVISIONING_BASE_URL;
    }

    async createCoreTask(task: NewCoreTask, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(task, ow.object.nonEmpty);
        ow(task.cores, 'cores', ow.array.nonEmpty);
        ow(task.type, 'type', ow.string.oneOf(['Create', 'Delete']))

        for (const c of task.cores) {
            ow(c.name, 'core device name', ow.string.nonEmpty);
            ow(c.provisioningTemplate, 'core device provisioning template', ow.string.nonEmpty);
        }

        if (task.type === 'Delete') {
            ow(task.options, 'delete core options', ow.object.nonEmpty);
        }

        const url = `${this.baseUrl}${super.coreTasksRelativeUrl()}`;

        const r = await request.post(url)
            .send(task)
            .set(this.buildHeaders(additionalHeaders));

        return r.header['x-taskid'];

    }

    async getCoreTask(taskId: string, additionalHeaders?: RequestHeaders): Promise<CoreTask> {

        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.coreTaskRelativeUrl(taskId)}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;

    }

    async getCore(name: string, additionalHeaders?: RequestHeaders): Promise<Core> {

        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.coreRelativeUrl(name)}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;

    }

    async listCores(additionalHeaders?: RequestHeaders): Promise<CoreList> {

        const url = `${this.baseUrl}${super.coresRelativeUrl()}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;
    }


    async listDeploymentsByCore(name: string, additionalHeaders?: RequestHeaders): Promise<DeploymentList> {
        ow(name, ow.string.nonEmpty);
        const url = `${this.baseUrl}${super.deploymentsByCoreRelativeUrl(name)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;
    }

}
