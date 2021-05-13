/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
