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

import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';
import { createDelimitedAttribute, createDelimitedAttributePrefix, expandDelimitedAttribute, PkType } from '../utils/pkUtils.util';
import { CommandItem, CommandListIdsByTagPaginationKey, CommandListPaginationKey, Tags } from './commands.models';

import {DynamoDB} from 'aws-sdk';
import { DynamoDbUtils } from '../utils/dynamoDb.util';

@injectable()
export class CommandsDao {

    private readonly GSI1 = 'siKey1-sk-index';

    private _dc: DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.table') private table:string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async get(commandIds:string[]): Promise<CommandItem[]> {
        logger.debug(`commands.dao get: in: commandIds:${commandIds}`);


        const params:DocumentClient.BatchGetItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.table] = {
            Keys: commandIds.map(id => ({
                pk: createDelimitedAttribute(PkType.Command, id),
                sk: createDelimitedAttribute(PkType.Command, id),
            }))
        };

        logger.silly(`commands.dao get: params: ${JSON.stringify(params)}`);
        const response = await this.dynamoDbUtils.batchGetAll(params);
        logger.silly(`commands.dao get: response: ${JSON.stringify(response)}`);
        if (response?.Responses?.[this.table]==undefined) {
            logger.debug('commands.dao get: exit: commands:undefined');
            return undefined;
        }
        const commands = this.assembleCommands(response.Responses[this.table]);

        logger.debug(`commands.dao get: exit: commands:${JSON.stringify(commands)}`);
        return commands;
    }

    public async list(exclusiveStart?:CommandListPaginationKey, count?:number): Promise<[CommandItem[],CommandListPaginationKey]> {
        logger.debug(`commands.dao list: exclusiveStart:${JSON.stringify(exclusiveStart)}, count:${count}`);

        let exclusiveStartKey:DocumentClient.Key;
        if (exclusiveStart?.commandId) {
            const lastCommandId = createDelimitedAttribute(PkType.Command, exclusiveStart.commandId);
            exclusiveStartKey = {
                pk: lastCommandId,
                sk: lastCommandId,
                siKey1: PkType.Command,
            }
        }

        const params:DocumentClient.QueryInput = {
            TableName: this.table,
            IndexName: this.GSI1,
            KeyConditionExpression: `#hash = :hash`,
            ExpressionAttributeNames: {
                '#hash': 'siKey1'
            },
            ExpressionAttributeValues: {
                ':hash': PkType.Command
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count
        };

        logger.silly(`commands.dao list: QueryInput: ${JSON.stringify(params)}`);
        const results = await this._dc.query(params).promise();
        logger.silly(`query result: ${JSON.stringify(results)}`);
        if ((results?.Count??0) === 0) {
            logger.debug('commands.dao list: exit: [undefined,undefined]');
            return [undefined,undefined];
        } 

        const commands = this.assembleCommands(results.Items);

        let paginationKey:CommandListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedCommandId = expandDelimitedAttribute(results.LastEvaluatedKey.pk)[1];
            paginationKey = {
                commandId: lastEvaluatedCommandId,
            }
        }
        const response:[CommandItem[],CommandListPaginationKey] = [commands, paginationKey];
        logger.debug(`commands.dao list: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    public async listIds(tagKey: string, tagValue: string, exclusiveStart?:CommandListIdsByTagPaginationKey, count?:number): Promise<[string[],CommandListIdsByTagPaginationKey]> {
        logger.debug(`commands.dao listIds: tagKey:${tagKey}, tagValue:${tagValue}, exclusiveStart:${JSON.stringify(exclusiveStart)}, count:${count}`);

        let exclusiveStartKey:DocumentClient.Key;
        if (exclusiveStart?.commandId) {
            exclusiveStartKey = {
                pk: createDelimitedAttribute(PkType.Tag, exclusiveStart.tagKey),
                sk: createDelimitedAttribute(PkType.Tag, exclusiveStart.tagValue, PkType.Command, exclusiveStart.commandId),
            }
        }

        const params:DocumentClient.QueryInput = {
            TableName: this.table,
            KeyConditionExpression: `#hash = :hash AND begins_with(#sort,:sort)`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#sort': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.Tag, tagKey),
                ':sort': createDelimitedAttributePrefix(PkType.Tag, tagValue, PkType.Command),
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count
        };

        logger.silly(`commands.dao listIds: QueryInput: ${JSON.stringify(params)}`);
        const results = await this._dc.query(params).promise();
        logger.silly(`query result: ${JSON.stringify(results)}`);
        if ((results?.Count??0) === 0) {
            logger.debug('commands.dao listIds: exit: [undefined,undefined]');
            return [undefined,undefined];
        } 

        const commandIds:string[]=[];
        for(const i of results.Items) {
            commandIds.push( expandDelimitedAttribute(i.sk)[3]);
        }

        let paginationKey:CommandListIdsByTagPaginationKey;
        if (results.LastEvaluatedKey) {
            paginationKey = {
                tagKey: expandDelimitedAttribute(results.LastEvaluatedKey.pk)[1],
                tagValue: expandDelimitedAttribute(results.LastEvaluatedKey.sk)[1],
                commandId:  expandDelimitedAttribute(results.LastEvaluatedKey.sk)[3],
            }
        }
        const response:[string[],CommandListIdsByTagPaginationKey] = [commandIds, paginationKey];
        logger.debug(`commands.dao listIds: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    private assembleCommands(items:DocumentClient.ItemList) : CommandItem[] {
        const list:CommandItem[] = [];
        for(const attrs of items) {
            const r:CommandItem = {
                id: attrs.commandId,
                operation: attrs.operation,
                createdAt: new Date(attrs.createdAt),
                updatedAt: new Date(attrs.updatedAt),
                deliveryMethod: attrs.topicDeliveryMethod ?? attrs.shadowDeliveryMethod ?? attrs.jobDeliveryMethod,
                payloadTemplate: attrs.payloadTemplate,
                payloadParams: attrs.payloadParams,
                enabled: attrs.enabled,
                tags: attrs.tags,
            } ;
            list.push(r);
        }
        return list;
    }

    public async save(command:CommandItem, tagsToDelete?:Tags): Promise<void> {
        logger.debug(`commands.dao save: in: command:${JSON.stringify(command)}, tagsToDelete:${JSON.stringify(tagsToDelete)}`);

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };
        params.RequestItems[this.table] = [];

        /////// the main command item to save...
        const commandDbItem = {
            PutRequest: {   
                Item: {
                    pk: createDelimitedAttribute(PkType.Command, command.id),
                    sk: createDelimitedAttribute(PkType.Command, command.id),
                    commandId: command.id,
                    siKey1: PkType.Command,
                    siKey2: PkType.Command,
                    operation: command.operation,
                    enabled: command.enabled,
                    payloadTemplate: command.payloadTemplate,
                    payloadParams: command.payloadParams,
                    createdAt: command.createdAt.getTime(),
                    updatedAt: command.updatedAt?.getTime(),
                    tags: command.tags, // denormalized tags to simplify the assembly of the command
                }
            }
        };
        if (command.deliveryMethod?.type==='TOPIC') {
            commandDbItem.PutRequest.Item['topicDeliveryMethod'] = command.deliveryMethod;
        }
        if (command.deliveryMethod?.type==='SHADOW') {
            commandDbItem.PutRequest.Item['shadowDeliveryMethod'] = command.deliveryMethod;
        }
        if (command.deliveryMethod?.type==='JOB') {
            commandDbItem.PutRequest.Item['jobDeliveryMethod'] = command.deliveryMethod;
        }
        params.RequestItems[this.table].push(commandDbItem);

        /////// searchable tags to save...
        if (command.tags) {
            Object.entries(command.tags).forEach(([k,v]) => {
                const tagDbItem: DocumentClient.WriteRequest = {
                    PutRequest: {
                        Item: {
                            pk: createDelimitedAttribute(PkType.Tag, k),
                            sk: createDelimitedAttribute(PkType.Tag, v, PkType.Command, command.id),
                        }
                    }
                };
                params.RequestItems[this.table].push(tagDbItem);
            });
        }

        /////// old searchable tags to remove...
        if (tagsToDelete) {
            Object.entries(tagsToDelete).forEach(([k,v]) => {
                const tagDbItem: DocumentClient.WriteRequest = {
                    DeleteRequest: {
                        Key: {
                            pk: createDelimitedAttribute(PkType.Tag, k),
                            sk: createDelimitedAttribute(PkType.Tag, v, PkType.Command, command.id),
                        }
                    }
                };
                params.RequestItems[this.table].push(tagDbItem);
            });
        }

        logger.silly(`commands.dao save: params:${JSON.stringify(params)}`);
        const r = await this.dynamoDbUtils.batchWriteAll(params);
        logger.silly(`commands.dao save: r:${JSON.stringify(r)}`);
        if (this.dynamoDbUtils.hasUnprocessedItems(r)) {
            logger.error(`commands.dao save: has unprocessed items: ${JSON.stringify(r.UnprocessedItems)}`);
            throw new Error('SAVE_COMMAND_FAILED');
        }

        logger.debug(`commands.dao save: exit:`);

    }

    public async delete(commandId:string): Promise<void> {
        logger.debug(`commands.dao delete: in: commandId:${commandId}`);

        const command = (await this.get([commandId]))?.[0];

        const params:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
            }
        };
        
        const commandDbItem:DocumentClient.WriteRequest = {
            DeleteRequest: {
                Key: {
                    pk: createDelimitedAttribute(PkType.Command, commandId),
                    sk: createDelimitedAttribute(PkType.Command, commandId),
                }
            }
        };
        params.RequestItems[this.table] = [commandDbItem];

        if (command.tags) {
            Object.entries(command.tags).forEach(([k,v]) => {
                const tagDbItem:DocumentClient.WriteRequest = {
                    DeleteRequest: {
                        Key: {
                            pk: createDelimitedAttribute(PkType.Tag, k),
                            sk: createDelimitedAttribute(PkType.Tag, v, PkType.Command, commandId),
                        }
                    }
                };
                params.RequestItems[this.table].push(tagDbItem);
            });
        }     

        logger.silly(`commands.dao delete: params:${JSON.stringify(params)}`);
        const r = await this.dynamoDbUtils.batchWriteAll(params);
        logger.silly(`commands.dao delete: r:${JSON.stringify(r)}`);
        if (this.dynamoDbUtils.hasUnprocessedItems(r)) {
            logger.error(`commands.dao delete: has unprocessed items: ${JSON.stringify(r.UnprocessedItems)}`);
            throw new Error('DELETE_COMMAND_FAILED');
        }

        logger.debug(`commands.dao delete: exit:`);
    }

}
