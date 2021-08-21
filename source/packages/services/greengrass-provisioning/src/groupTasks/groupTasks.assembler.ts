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
import { TYPES } from '../di/types';
import { GroupsAssembler } from '../groups/groups.assembler';
import {logger} from '../utils/logger.util';
import { GroupTaskSummaryItem, GroupTaskSummaryResource } from './groupTasks.models';

@injectable()
export class GroupTasksAssembler {

    constructor( @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler) {}

    public toResource(item: GroupTaskSummaryItem): (GroupTaskSummaryResource) {
        logger.debug(`groupTasks.assembler toResource: in: item: ${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`groupTasks.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource= {};

        // common properties
        Object.keys(item).forEach(key=> {
            if (key!=='groups' && key!== 'batchesTotal' && key!=='batchesComplete') {
                resource[key] = item[key];
            } 
        });

        // properties with differences
        if (item.groups?.length>0) {
            resource['groups'] = item.groups.map(g=> this.groupsAssembler.toResource(g));
        }

        logger.debug(`groupTasks.assembler toResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource as GroupTaskSummaryResource;

    }

}
