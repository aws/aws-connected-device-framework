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

import {
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@aws-solutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { RequestHeaders } from './common.model';
import { DeploymentTask, NewDeploymentTask } from './deployments.model';
import { DeploymentsService, DeploymentsServiceBase } from './deployments.service';

@injectable()
export class DeploymentsLambdaService
    extends DeploymentsServiceBase
    implements DeploymentsService
{
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.GREENGRASS2PROVISIONING_API_FUNCTION_NAME;
    }

    async createDeploymentTask(
        task: NewDeploymentTask,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(task?.template?.name, 'template name', ow.string.nonEmpty);
        ow(task.targets, 'targets', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentTasksRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(task);

        const r = await this.lambdaInvoker.invoke(this.functionName, event);
        return r.header['x-taskid'];
    }

    async getDeploymentTask(
        taskId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<DeploymentTask> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentTaskRelativeUrl(taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
