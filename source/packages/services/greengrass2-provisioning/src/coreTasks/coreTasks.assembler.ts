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
import { inject, injectable } from 'inversify';

import { logger } from '@awssolutions/simple-cdf-logger';
import { CoresAssembler } from '../cores/cores.assembler';
import { TYPES } from '../di/types';
import { CoreTaskListPaginationKey } from './coreTasks.dao';
import {
    CoreTaskItem,
    CoreTaskListResource,
    CoreTaskResource,
    NewCoreTaskResource,
} from './coreTasks.models';

@injectable()
export class CoreTasksAssembler {
    constructor(@inject(TYPES.CoresAssembler) private coresAssembler: CoresAssembler) {}

    public toResource(item: CoreTaskItem): CoreTaskResource {
        logger.debug(`coreTasks.assembler toResource: in: item:${JSON.stringify(item)}`);

        const resource: CoreTaskResource = {
            id: item.id,
            coreVersion: item.coreVersion,
            cores: this.coresAssembler.toResourceArray(item.cores),
            taskStatus: item.taskStatus,
            statusMessage: item.statusMessage,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            type: item.type,
            options: item.options,
        };

        logger.debug(`coreTasks.assembler toResource: exit:${JSON.stringify(resource)}`);
        return resource;
    }

    public toItem(resource: NewCoreTaskResource): CoreTaskItem {
        logger.debug(`coreTasks.assembler toItem: in: resource:${JSON.stringify(resource)}`);

        const item: CoreTaskItem = {
            coreVersion: resource.coreVersion,
            cores: resource.cores,
            type: resource.type,
            options: resource.options,
        };

        logger.debug(`coreTasks.assembler toItem: exit:${JSON.stringify(item)}`);
        return item;
    }

    public toListResource(
        items: CoreTaskItem[],
        count?: number,
        paginateFrom?: CoreTaskListPaginationKey,
    ): CoreTaskListResource {
        logger.debug(
            `coreTasks.assembler toListResource: in: items:${JSON.stringify(
                items,
            )}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`,
        );

        const list: CoreTaskListResource = {
            tasks: [],
        };

        if (count !== undefined || paginateFrom !== undefined) {
            list.pagination = {};
        }

        if (count !== undefined) {
            list.pagination.count = count;
        }

        if (paginateFrom !== undefined) {
            list.pagination.lastEvaluated = {
                taskId: paginateFrom?.taskId,
            };
        }

        if ((items?.length ?? 0) > 0) {
            items.forEach((i) => list.tasks.push(this.toResource(i)));
        }

        logger.debug(`coreTasks.assembler toListResource: exit: ${JSON.stringify(list)}`);
        return list;
    }
}
