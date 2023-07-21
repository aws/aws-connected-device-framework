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
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { DeploymentList } from '..';
import { RequestHeaders } from './common.model';
import { Core, CoreList, CoreTask, NewCoreTask } from './cores.model';
import { CoresService, CoresServiceBase } from './cores.service';

@injectable()
export class CoresLambdaService extends CoresServiceBase implements CoresService {
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.GREENGRASS2PROVISIONING_API_FUNCTION_NAME;
    }

    async createCoreTask(task: NewCoreTask, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(task, ow.object.nonEmpty);
        ow(task.type, 'type', ow.string.oneOf(['Create', 'Delete']));
        ow(task.cores, 'cores', ow.array.nonEmpty);

        for (const c of task.cores) {
            ow(c.name, 'core device name', ow.string.nonEmpty);
            ow(c.provisioningTemplate, 'core device provisioning template', ow.string.nonEmpty);
        }

        if (task.type === 'Delete') {
            ow(task.options, 'delete core options', ow.object.nonEmpty);
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.coreTasksRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(task);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res?.header['x-taskid'];
    }

    async getCoreTask(taskId: string, additionalHeaders?: RequestHeaders): Promise<CoreTask> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.coreTaskRelativeUrl(taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getCore(name: string, additionalHeaders?: RequestHeaders): Promise<Core> {
        ow(name, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.coreRelativeUrl(name))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listCores(additionalHeaders?: RequestHeaders): Promise<CoreList> {
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.coresRelativeUrl())
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listDeploymentsByCore(
        coreName: string,
        additionalHeaders?: RequestHeaders
    ): Promise<DeploymentList> {
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentsByCoreRelativeUrl(coreName))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
