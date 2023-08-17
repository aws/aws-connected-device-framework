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

import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
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
        ow(task.type, 'type', ow.string.oneOf(['Create', 'Delete']));

        for (const c of task.cores) {
            ow(c.name, 'core device name', ow.string.nonEmpty);
            ow(c.provisioningTemplate, 'core device provisioning template', ow.string.nonEmpty);
        }

        if (task.type === 'Delete') {
            ow(task.options, 'delete core options', ow.object.nonEmpty);
        }

        const url = `${this.baseUrl}${super.coreTasksRelativeUrl()}`;

        return await request
            .post(url)
            .send(task)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.header['x-taskid'];
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getCoreTask(taskId: string, additionalHeaders?: RequestHeaders): Promise<CoreTask> {
        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.coreTaskRelativeUrl(taskId)}`;

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getCore(name: string, additionalHeaders?: RequestHeaders): Promise<Core> {
        ow(name, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.coreRelativeUrl(name)}`;

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listCores(additionalHeaders?: RequestHeaders): Promise<CoreList> {
        const url = `${this.baseUrl}${super.coresRelativeUrl()}`;

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listDeploymentsByCore(
        name: string,
        additionalHeaders?: RequestHeaders
    ): Promise<DeploymentList> {
        ow(name, ow.string.nonEmpty);
        const url = `${this.baseUrl}${super.deploymentsByCoreRelativeUrl(name)}`;
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
