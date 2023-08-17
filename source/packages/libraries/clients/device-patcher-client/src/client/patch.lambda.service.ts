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

import { RequestHeaders } from './common.model';
import {
    ListPatchResponse,
    PatchResponse,
    PatchTaskRequest,
    PatchTaskResponse,
    UpdatePatchRequest,
} from './patch.model';
import { PatchService, PatchServiceBase } from './patch.service';

@injectable()
export class PatchLambdaService extends PatchServiceBase implements PatchService {
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.DEVICE_PATCHER_API_FUNCTION_NAME;
    }

    public async createPatchTask(
        patchTaskRequest: PatchTaskRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(patchTaskRequest, ow.object.nonEmpty);
        ow(patchTaskRequest.patches, ow.array.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.patchTasksRelativeUrl())
            .setPath('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(patchTaskRequest);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        const location = res.header?.location;
        return location.substring(location.lastIndexOf('/') + 1);
    }

    public async getPatch(
        patchId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<PatchResponse> {
        ow(patchId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.patchesRelativeUrl(patchId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getPatchTask(
        taskId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<PatchTaskResponse> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.patchTaskRelativeUrl(taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async listPatchesByTaskId(
        taskId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ListPatchResponse> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.patchByTaskRelativeUrl(taskId))
            .setQueryStringParameters({ status })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async listPatchesByDeviceId(
        deviceId: string,
        status?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ListPatchResponse> {
        ow(deviceId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.patchByDeviceRelativeUrl(deviceId))
            .setQueryStringParameters({ status })
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async updatePatch(
        patchRequest: UpdatePatchRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(patchRequest, ow.object.nonEmpty);
        ow(patchRequest.patchStatus, ow.string.nonEmpty);
        ow(patchRequest.patchId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.patchesRelativeUrl(patchRequest.patchId))
            .setPath('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(patchRequest);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    public async deletePatch(patchId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(patchId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.patchesRelativeUrl(patchId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
