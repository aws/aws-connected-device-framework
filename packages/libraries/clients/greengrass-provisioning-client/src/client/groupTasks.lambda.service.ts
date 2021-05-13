/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
