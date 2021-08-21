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

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {RequestHeaders} from './common.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { GroupTasksService, GroupTasksServiceBase } from './groupTasks.service';
import { GroupTaskItem, GroupTaskSummary } from './groupTasks.model';

@injectable()
export class GroupTasksLambdaService extends GroupTasksServiceBase implements GroupTasksService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('greengrassProvisioning.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createGroupTask(groups:GroupTaskItem[], additionalHeaders?:RequestHeaders) : Promise<GroupTaskSummary> {

        ow(groups, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.groupTasksRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody({groups});

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async updateGroupTask(groups:GroupTaskItem[], additionalHeaders?:RequestHeaders) : Promise<GroupTaskSummary> {
        ow(groups, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.groupTasksRelativeUrl())
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getGroupTask(taskId:string, additionalHeaders?:RequestHeaders) : Promise<GroupTaskSummary> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.groupTaskRelativeUrl(taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

            const res = await this.lambdaInvoker.invoke(this.functionName, event);
            return res.body;
    }

}
