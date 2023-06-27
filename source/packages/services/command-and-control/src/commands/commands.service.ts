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

import { SendMessageResult } from 'aws-sdk/clients/sqs';
import merge from 'deepmerge';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import pLimit from 'p-limit';
import ShortUniqueId from 'short-unique-id';
import { TYPES } from '../di/types';
import { MessageItem, MessageListPaginationKey } from '../messages/messages.models';
import { MessagesService } from '../messages/messages.service';
import { logger } from '../utils/logger.util';
import { CommandsDao } from './commands.dao';
import {
    CommandItem,
    CommandListIdsByTagPaginationKey,
    CommandListPaginationKey,
    Tags,
} from './commands.models';
import { CommandsValidator } from './commands.validator';

@injectable()
export class CommandsService {
    private MAX_LIST_RESULTS = 20;

    private readonly uidGenerator: ShortUniqueId;
    private sqs: AWS.SQS;

    constructor(
        @inject('promises.concurrency') private promisesConcurrency: number,
        @inject('aws.sqs.queues.commands.queueUrl') private commandsQueueUrl: string,
        @inject(TYPES.CommandsValidator) private validator: CommandsValidator,
        @inject(TYPES.CommandsDao) private commandDao: CommandsDao,
        @inject(TYPES.MessagesService) private messagesService: MessagesService,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS
    ) {
        this.sqs = sqsFactory();

        this.uidGenerator = new ShortUniqueId({
            dictionary: 'alphanum_lower',
            length: 9,
        });
    }

    public async get(commandIds: string[]): Promise<CommandItem[]> {
        logger.debug(`commands.service get: in: commandIds:${JSON.stringify(commandIds)}`);

        ow(commandIds, ow.array.nonEmpty);

        const commands = await this.commandDao.get(commandIds);
        logger.debug(`commands.service get: exit: commands:${JSON.stringify(commands)}`);
        return commands;
    }

    public async list(
        tags?: Tags,
        exclusiveStart?: CommandListPaginationKey,
        count?: number
    ): Promise<[CommandItem[], CommandListPaginationKey]> {
        logger.debug(
            `commands.service list: in: tags:${JSON.stringify(
                tags
            )}, exclusiveStart:${JSON.stringify(exclusiveStart)}, count:${count}`
        );

        if (count) {
            count = Number(count);
            ow(count, ow.number.greaterThanOrEqual(1));
        }

        // if a filter (tags) have been provided then we need to get the list of commands that match the tags. if not we can simply list all
        let results: [CommandItem[], CommandListPaginationKey] = [undefined, undefined];
        if (tags && Object.keys(tags).length > 0) {
            // first retrieve the list of commandIds that match all the tags
            const [commandIds, paginationKey] = await this.listIds(tags, exclusiveStart, count);
            if ((commandIds?.length ?? 0) > 0) {
                // next retrieve the actual commands
                const commands = await this.get(commandIds);
                results = [commands, paginationKey];
            }
        } else {
            results = await this.commandDao.list(exclusiveStart, count);
        }

        logger.debug(`commands.service list: exit: results:${JSON.stringify(results)}`);
        return results;
    }

    public async listIds(
        tags: Tags,
        exclusiveStart?: CommandListPaginationKey,
        count = this.MAX_LIST_RESULTS
    ): Promise<[string[], CommandListPaginationKey]> {
        logger.debug(
            `commands.service listIds: in: tags:${JSON.stringify(
                tags
            )}, exclusiveStart:${JSON.stringify(exclusiveStart)}, count:${count}`
        );

        if (count) {
            count = Number(count);
        }

        // convert tags map to arrays to make referencing them later easier
        const tagKeys = Object.keys(tags);
        const tagValues = Object.values(tags);
        const tagCount = tagKeys.length;

        // retrieve the first page of results for each tag
        const resultsForTagsFutures: Promise<[string[], CommandListIdsByTagPaginationKey]>[] =
            new Array(tagCount);
        for (let tagIndex = 0; tagIndex < tagCount; tagIndex++) {
            const paginationKey: CommandListIdsByTagPaginationKey = {
                commandId: exclusiveStart?.commandId,
                tagKey: tagKeys[tagIndex],
                tagValue: tagValues[tagIndex],
            };
            resultsForTagsFutures[tagIndex] = this.commandDao.listIds(
                tagKeys[tagIndex],
                tagValues[tagIndex],
                paginationKey,
                count
            );
        }
        const resultsForTags = await Promise.all(resultsForTagsFutures);
        const idsForTags = resultsForTags.map(([ids, _paginationKey]) => ids);

        // if any of the initial results are empty, then we can exit immediately as no common matches
        for (let tagIndex = 0; tagIndex < tagCount; tagIndex++) {
            if ((idsForTags[tagIndex]?.length ?? 0) === 0) {
                return [undefined, undefined];
            }
        }

        // this inline function will populate new pages of command ids for a specific tag
        const getNextPageOfResults = async (tagIndex: number): Promise<boolean> => {
            const paginationKey = resultsForTags[tagIndex]?.[1];
            if (paginationKey === undefined) {
                // no more to process
                return false;
            }
            resultsForTags[tagIndex] = await this.commandDao.listIds(
                tagKeys[tagIndex],
                tagValues[tagIndex],
                paginationKey,
                count
            );
            if ((resultsForTags[tagIndex]?.[0]?.length ?? 0) === 0) {
                // no more to process
                return false;
            } else {
                // store the new page of tags, and reset its pointer
                idsForTags[tagIndex] = resultsForTags[tagIndex]?.[0];
                listPointers[tagIndex] = 0;
                return true;
            }
        };

        // process each list of commandIds per tag, saving where the commandId is found across all tags
        const matched: string[] = [];
        let keepGoing = true;
        const listPointers = new Array(tagCount).fill(0);
        while (keepGoing && matched.length < count) {
            for (let tagIndex = 0; tagIndex < tagCount; tagIndex++) {
                let currentTagCommandId = idsForTags[tagIndex][listPointers[tagIndex]];
                if (currentTagCommandId === undefined) {
                    keepGoing = await getNextPageOfResults(tagIndex);
                    if (!keepGoing) break;
                    currentTagCommandId = idsForTags[tagIndex][listPointers[tagIndex]];
                }
                // if we reached the last tag index, it means we found a match across all tags
                if (tagIndex === tagCount - 1) {
                    // add the matched id to the result
                    matched.push(currentTagCommandId);
                    // increment all the pointers
                    listPointers.forEach((_value, index) => listPointers[index]++);
                } else {
                    // check for matching commandIds between this and the next tag being compared
                    let nextTagCommandId = idsForTags[tagIndex + 1][listPointers[tagIndex + 1]];
                    if (nextTagCommandId === undefined) {
                        keepGoing = await getNextPageOfResults(tagIndex + 1);
                        if (!keepGoing) break;
                        nextTagCommandId = idsForTags[tagIndex + 1][listPointers[tagIndex + 1]];
                    }
                    if (currentTagCommandId === nextTagCommandId) {
                        // commands match, so move onto checking the next tag pair
                        continue;
                    } else if (currentTagCommandId < nextTagCommandId) {
                        // this tag has a lower command id, therefore increment this tags index
                        listPointers[tagIndex]++;
                        break;
                    } else {
                        // the next tag has a lower command id, therefore increment the next tags index
                        listPointers[tagIndex + 1]++;
                        break;
                    }
                }
            }
        }

        let paginationKey: CommandListPaginationKey;
        if (matched.length === count) {
            paginationKey = {
                commandId: matched[count - 1],
            };
        }

        const result: [string[], CommandListPaginationKey] = [matched, paginationKey];
        logger.debug(`commands.service list: exit: result:${JSON.stringify(result)}`);
        return result;
    }

    public async create(command: CommandItem): Promise<string> {
        return await this.createWithName(command, this.uidGenerator());
    }

    public async createWithName(command: CommandItem, commandName: string): Promise<string> {
        logger.debug(`commands.service: create: in: command: ${JSON.stringify(command)}`);

        command.id = commandName;
        command.createdAt = new Date();
        command.updatedAt = command.createdAt;

        this.validator.validate(command);

        await this.commandDao.save(command);

        logger.debug(`commands.service: create: exit:${command.id}`);
        return command.id;
    }

    public async update(updated: CommandItem): Promise<void> {
        logger.debug(`commands.service: update: in: updated: ${JSON.stringify(updated)}`);

        ow(updated, ow.object.nonEmpty);
        ow(updated.id, ow.string.nonEmpty);

        updated.updatedAt = new Date();

        const existing = (await this.get([updated.id]))?.[0];
        if (existing === undefined) {
            logger.error(`commands.service: update: command not found`);
            throw new Error('NOT_FOUND');
        }

        if (
            updated.deliveryMethod?.type !== undefined &&
            existing.deliveryMethod.type !== updated.deliveryMethod.type
        ) {
            throw new Error('FAILED_VALIDATION: updating delivery method type is not allowed');
        }

        // merge the old with the new so we have a version of the command with the latest changes to save.
        // hack to get around deepmerge failing to merge some properties when using a typed object:
        const existingAsJson = JSON.parse(JSON.stringify(existing));
        const updatedAsJson = JSON.parse(JSON.stringify(updated));
        const merged = merge(existingAsJson, updatedAsJson, {
            arrayMerge: (_, updated) => updated,
        }) as CommandItem;
        merged.createdAt = new Date(merged.createdAt);
        merged.updatedAt = new Date(merged.updatedAt);

        // figure out if there are any tags that have changed which will need to be deleted
        const tagsToDelete: Tags = {};
        if (existing.tags) {
            for (const k of Object.keys(existing.tags)) {
                if (existing.tags?.[k] !== updated.tags[k]) {
                    tagsToDelete[k] = existing.tags[k];
                }
            }
        }

        this.validator.validate(merged);
        await this.commandDao.save(merged, tagsToDelete);

        logger.debug(`commands.service: update: exit:`);
    }

    public async delete(commandId: string): Promise<void> {
        logger.debug(`commands.service delete: in:commandId:${commandId}`);

        ow(commandId, ow.string.nonEmpty);

        // send a message to the SQS queue to async delete the command
        await this.sqsSendCommandForDeletion(commandId);

        logger.debug(`commands.service delete: exit:`);
    }

    public async processCommandDeletion(commandId: string): Promise<void> {
        logger.debug(`commands.service processCommandDeletion: in:commandId:${commandId}`);

        ow(commandId, ow.string.nonEmpty);

        // retrieve all messages related to this command
        const messages: MessageItem[] = [];
        let exclusiveStartKey: MessageListPaginationKey;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const result = await this.messagesService.listMessages(commandId, exclusiveStartKey);
            messages.push(...result[0]);
            if (result[1] === undefined) {
                break;
            }
            exclusiveStartKey = result[1];
        }

        // delete all messages
        const futures: Promise<void>[] = [];
        const limit = pLimit(this.promisesConcurrency);
        for (const m of messages) {
            futures.push(limit(() => this.messagesService.deleteMessage(m.id)));
        }
        await Promise.all(futures);

        // delete the command. note that the deletion of the messages above is async as could be many, but we don't need to wait
        await this.commandDao.delete(commandId);
        logger.debug(`commands.service processCommandDeletion: exit:`);
    }

    private async sqsSendCommandForDeletion(commandId: string): Promise<SendMessageResult> {
        const params: AWS.SQS.Types.SendMessageRequest = {
            QueueUrl: this.commandsQueueUrl,
            MessageBody: JSON.stringify({
                commandId,
            }),
            MessageAttributes: {
                messageType: {
                    DataType: 'String',
                    StringValue: `Command::Delete`,
                },
            },
        };
        logger.debug(
            `commands.service sqsSendCommandForDeletion: params: ${JSON.stringify(params)}`
        );

        return this.sqs.sendMessage(params).promise();
    }
}
