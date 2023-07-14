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
import { WorkflowAction } from './workflow.interfaces';
import { TYPES } from '../../di/types';
import { injectable, inject } from 'inversify';
import { MessageItem, Recipient } from '../messages.models';
import { logger } from '@awssolutions/simple-cdf-logger';
import ow from 'ow';
import {
    AwsIotThingListBuilder,
    THING_LIST_BUILDER_TYPES,
} from '@awssolutions/cdf-thing-list-builder';
import { MessagesDao } from '../messages.dao';
import { CommandItem } from '../../commands/commands.models';

@injectable()
export class ResolveTargetsAction implements WorkflowAction {
    constructor(
        @inject(TYPES.MessagesDao) private messagesDao: MessagesDao,
        @inject(THING_LIST_BUILDER_TYPES.AwsIotThingListBuilder)
        private awsIotThingListBuilder: AwsIotThingListBuilder,
    ) {}

    async process(message: MessageItem, command: CommandItem): Promise<boolean> {
        logger.debug(
            `workflow.resolveTargets process: message:${JSON.stringify(
                message,
            )}, command:${JSON.stringify(command)}`,
        );

        ow(command, ow.object.plain);
        ow(message, ow.object.plain);

        const skipResolveThingGroups: Recipient[] =
            message.targets?.awsIoT?.thingGroups
                ?.filter((o) => !o.expand)
                .map((o) => {
                    return {
                        id: o.name,
                        status: 'pending',
                        type: 'thingGroup',
                    };
                }) ?? [];

        const resolvedTargets = await this.awsIotThingListBuilder.listThings({
            thingNames: message.targets?.awsIoT?.thingNames,
            thingGroupNames: message.targets?.awsIoT?.thingGroups
                ?.filter((o) => o.expand)
                .map((o) => o.name),
            assetLibraryDeviceIds: message.targets?.assetLibrary?.deviceIds,
            assetLibraryGroupPaths: message.targets?.assetLibrary?.groupPaths,
            assetLibraryQuery: message.targets?.assetLibrary?.query,
        });

        message.resolvedTargets = resolvedTargets.thingNames?.map((t) => ({
            id: t,
            status: 'pending',
            type: 'thing',
        }));

        message.resolvedTargets.push(...skipResolveThingGroups);

        await this.messagesDao.saveResolvedTargets(message);

        logger.debug('workflow.resolveTargets process: exit:true');
        return true;
    }
}
