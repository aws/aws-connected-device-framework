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
import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { DeploymentsServiceBase, DeploymentsService } from './deployments.service';
import { Deployment, DeploymentTaskSummary } from './deployments.model';

@injectable()
export class DeploymentsApigwService extends DeploymentsServiceBase implements DeploymentsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassProvisioning.baseUrl') as string;
    }

    async createDeploymentTask(deployments:Deployment[], additionalHeaders?:RequestHeaders) : Promise<DeploymentTaskSummary> {
        ow(deployments, ow.array.minLength(1));

        const url = `${this.baseUrl}${super.deploymentsRelativeUrl()}`;
        const body = {
            deployments
        };
        const res = await request.post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getDeploymentTask(deploymentId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentTaskSummary> {
        ow(deploymentId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentsByIdRelativeUrl(deploymentId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }
}
