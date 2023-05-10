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

import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { QSHelper } from '../utils/qs.helper';
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
export class PatchApigwService extends PatchServiceBase implements PatchService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.DEVICE_PATCHER_BASE_URL;
    }

    public async createPatchTask(
        patchTaskRequest: PatchTaskRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(patchTaskRequest, ow.object.nonEmpty);
        ow(patchTaskRequest.patches, ow.array.nonEmpty);

        return await request
            .post(`${this.baseUrl}${super.patchTasksRelativeUrl()}`)
            .set(super.buildHeaders(additionalHeaders))
            .send(patchTaskRequest)
            .use(await signClientRequest())
            .then((res) => {
                const location = res.get('Location');
                return location.substring(location.lastIndexOf('/') + 1);
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    public async getPatch(
        patchId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<PatchResponse> {
        ow(patchId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.patchesRelativeUrl(patchId)}`;
        return await request
            .get(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    public async getPatchTask(
        taskId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<PatchTaskResponse> {
        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.patchTaskRelativeUrl(taskId)}`;
        return await request
            .get(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    public async listPatchesByTaskId(
        taskId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ListPatchResponse> {
        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.patchByTaskRelativeUrl(taskId)}`;
        return await request
            .get(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    public async listPatchesByDeviceId(
        deviceId: string,
        status?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ListPatchResponse> {
        ow(deviceId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.patchByDeviceRelativeUrl(deviceId)}`;

        const queryString = QSHelper.getQueryString({ status });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    public async updatePatch(
        patchRequest: UpdatePatchRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(patchRequest, ow.object.nonEmpty);
        ow(patchRequest.patchStatus, ow.string.nonEmpty);
        ow(patchRequest.patchId, ow.string.nonEmpty);

        return await request
            .post(`${this.baseUrl}${super.patchesRelativeUrl(patchRequest.patchId)}`)
            .set(super.buildHeaders(additionalHeaders))
            .send(patchRequest)
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    public async deletePatch(patchId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(patchId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.patchesRelativeUrl(patchId)}`;
        return await request
            .delete(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
