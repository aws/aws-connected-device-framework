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
import { Core, CoreList, CoreTask, NewCoreTask } from './cores.model';
import { DeploymentList } from './deployments.model';

export interface CoresService {
    createCoreTask(task: NewCoreTask, additionalHeaders?: RequestHeaders): Promise<string>;

    getCoreTask(taskId: string, additionalHeaders?: RequestHeaders): Promise<CoreTask>;

    getCore(name: string, additionalHeaders?: RequestHeaders): Promise<Core>;

    listCores(additionalHeaders?: RequestHeaders): Promise<CoreList>;

    listDeploymentsByCore(
        coreName: string,
        additionalHeaders?: RequestHeaders
    ): Promise<DeploymentList>;
}

@injectable()
export class CoresServiceBase extends ClientServiceBase {
    constructor() {
        super();
    }

    protected coreRelativeUrl(name: string): string {
        return PathHelper.encodeUrl('cores', name);
    }

    protected coresRelativeUrl(): string {
        return '/cores';
    }

    protected coreTasksRelativeUrl(): string {
        return '/coreTasks';
    }

    protected deploymentsByCoreRelativeUrl(name: string): string {
        return PathHelper.encodeUrl('cores', name, 'deployments');
    }

    protected coreTaskRelativeUrl(taskId: string): string {
        return PathHelper.encodeUrl('coreTasks', taskId);
    }
}
