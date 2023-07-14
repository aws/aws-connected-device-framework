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
import { injectable } from 'inversify';
import { PathHelper } from '../utils/path.helper';
import { RequestHeaders } from './common.model';
import { ClientServiceBase } from './common.service';
import {
    ListPatchResponse,
    PatchResponse,
    PatchTaskRequest,
    PatchTaskResponse,
    UpdatePatchRequest,
} from './patch.model';

export interface PatchService {
    createPatchTask(
        patchRequest: PatchTaskRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<string>;

    getPatchTask(taskId: string, additionalHeaders?: RequestHeaders): Promise<PatchTaskResponse>;

    getPatch(patchId: string, additionalHeaders?: RequestHeaders): Promise<PatchResponse>;

    listPatchesByTaskId(
        taskId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ListPatchResponse>;

    listPatchesByDeviceId(
        deviceId: string,
        status?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ListPatchResponse>;

    updatePatch(patch: UpdatePatchRequest, additionalHeaders?: RequestHeaders): Promise<void>;

    deletePatch(patchId: string, additionalHeaders?: RequestHeaders): Promise<void>;
}

@injectable()
export class PatchServiceBase extends ClientServiceBase {
    constructor() {
        super();
    }

    protected patchTasksRelativeUrl(): string {
        return PathHelper.encodeUrl('patchTasks');
    }

    protected patchTaskRelativeUrl(taskId: string): string {
        return PathHelper.encodeUrl('patchTasks', taskId);
    }

    protected patchByTaskRelativeUrl(taskId: string): string {
        return PathHelper.encodeUrl('patchTasks', taskId, 'patches');
    }

    protected patchesRelativeUrl(patchId: string): string {
        return PathHelper.encodeUrl('patches', patchId);
    }

    protected patchByDeviceRelativeUrl(deviceId: string): string {
        return PathHelper.encodeUrl('devices', deviceId, 'patches');
    }
}
