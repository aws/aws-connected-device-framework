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
import AWS = require('aws-sdk');
import { inject, injectable } from 'inversify';
import btoa from 'btoa';
import atob from 'atob';

import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';
import { createDelimitedAttribute, expandDelimitedAttribute, PkType } from '../utils/pKUtils.util';

import { PatchTaskItem, PatchTaskList } from './patchTask.model';
import { PatchItem } from './patch.model';
import { PatchDao } from './patch.dao';

@injectable()
export class PatchTaskDao {
    private dc: AWS.DynamoDB.DocumentClient;
    private readonly tableName = process.env.AWS_DYNAMODB_TABLE_NAME;

    constructor(
        @inject(TYPES.DocumentClientFactory)
        documentClientFactory: () => AWS.DynamoDB.DocumentClient,
        @inject(TYPES.PatchDao) private patchDao: PatchDao,
    ) {
        this.dc = documentClientFactory();
    }

    public async save(task: PatchTaskItem): Promise<void> {
        logger.debug(`patch.dao: save: in: patchTask: ${JSON.stringify(task)}`);

        const params = {
            TableName: this.tableName,
            Item: {
                pk: createDelimitedAttribute(PkType.PatchTask, task.taskId),
                sk: createDelimitedAttribute(PkType.PatchTask, task.taskId),
                si1Sort: createDelimitedAttribute(PkType.PatchTask),
                createdAt: task.createdAt?.toISOString(),
                updatedAt: task.updatedAt?.toISOString(),
            },
        };

        await this.dc.put(params).promise();

        logger.debug(`patch.dao: save: exit: `);
    }

    public async get(taskId: string): Promise<PatchTaskItem> {
        logger.debug(`patchTask.dao:get:in:taskId:${taskId}`);

        const params = {
            TableName: this.tableName,
            Key: {
                pk: createDelimitedAttribute(PkType.PatchTask, taskId),
                sk: createDelimitedAttribute(PkType.PatchTask, taskId),
            },
        };

        const result = await this.dc.get(params).promise();
        if (result.Item === undefined) {
            logger.debug('agentbasedPatchs.dao exit: undefined');
            return undefined;
        }

        const patchTaskList = this.assemble([result.Item]);

        logger.debug(`patch.dao: list: exit: patchList: ${JSON.stringify(patchTaskList)}`);

        return patchTaskList.patchTasks[0];
    }

    public async getPatchs(
        taskId: string,
        count?: number,
        exclusiveStart?: PatchListPaginationKey,
    ): Promise<[PatchItem[], PatchListPaginationKey]> {
        logger.debug(`patchTask.dao:getPatchs:in:taskId:${taskId}`);

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (exclusiveStart?.nextToken) {
            const decoded = atob(`${exclusiveStart?.nextToken}`);
            exclusiveStartKey = JSON.parse(decoded);
        }

        const params = {
            TableName: this.tableName,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
                '#sk': 'sk',
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.PatchTask, taskId),
                ':sk': createDelimitedAttribute(PkType.DevicePatch),
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        const results = await this.dc.query(params).promise();
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug(`patchTask.dao:getPatchs exit: undefined`);
            return [undefined, undefined];
        }

        const patchItemKeys = results.Items.map((item) => {
            return {
                patchId: expandDelimitedAttribute(item.sk)[1],
                deviceId: expandDelimitedAttribute(item.si2Hash)[1],
            };
        });

        const patches = await this.patchDao.getBulk(patchItemKeys);

        let paginationKey: PatchListPaginationKey;
        if (results.LastEvaluatedKey) {
            const nextToken = btoa(`${JSON.stringify(results.LastEvaluatedKey)}`);
            paginationKey = {
                nextToken,
            };
        }

        logger.debug(
            `patchTask.dao:getPatchs: exit: response:${JSON.stringify(
                patches,
            )}, paginationKey:${paginationKey}`,
        );
        return [patches, paginationKey];
    }

    private assemble(items: AWS.DynamoDB.DocumentClient.ItemList): PatchTaskList {
        const list = new PatchTaskList();

        for (const i of items) {
            const pkElements = i.pk.split(':');
            const patch: PatchTaskItem = {
                taskId: pkElements[1],
                createdAt: new Date(i.createdAt),
                updatedAt: new Date(i.updatedAt),
            };

            list.patchTasks.push(patch);
        }
        return list;
    }
}

export declare type PatchListPaginationKey = {
    nextToken: string;
};

export type DynamoDbPaginationKey = { [key: string]: string };
