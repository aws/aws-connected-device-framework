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
import AWS from 'aws-sdk';
import { inject, injectable } from 'inversify';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { PkType, createDelimitedAttribute, expandDelimitedAttribute } from '../utils/pKUtils.util';

import atob from 'atob';
import btoa from 'btoa';
import { PatchItem } from './patch.model';
import { DynamoDbPaginationKey, PatchListPaginationKey } from './patchTask.dao';

@injectable()
export class PatchDao {
    private dc: AWS.DynamoDB.DocumentClient;
    private readonly SI1_INDEX = 'sk-si1Sort-index';
    private readonly tableName = process.env.AWS_DYNAMODB_TABLE_NAME;

    constructor(
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
        @inject(TYPES.DocumentClientFactory)
        documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async save(patch: PatchItem): Promise<void> {
        logger.debug(`patch.dao: save: in: patch: ${JSON.stringify(patch)}`);

        const params = {
            TableName: this.tableName,
            Item: {
                pk: createDelimitedAttribute(PkType.DevicePatch, patch.patchId),
                sk: createDelimitedAttribute(PkType.Device, patch.deviceId),
                si1Sort: createDelimitedAttribute(
                    PkType.DevicePatch,
                    patch.patchStatus,
                    patch.patchId
                ),
                si2Hash: createDelimitedAttribute(
                    PkType.PatchTemplate,
                    patch.patchTemplateName,
                    PkType.PatchTemplateVersion,
                    patch.patchTemplate.versionNo
                ),
                createdAt: patch.createdAt?.toISOString(),
                updatedAt: patch.updatedAt?.toISOString(),
                patchTemplateName: patch.patchTemplateName,
                patchStatus: patch.patchStatus,
                patchType: patch.patchType,
                extraVars: patch.extraVars,
            },
        };

        await this.dc.put(params).promise();

        logger.debug(`patch.dao: save: exit: `);
    }

    public async saveBatches(patches: PatchItem[]): Promise<void> {
        logger.debug(`patch.dao: saveBatches: in: patch: ${JSON.stringify(patches)}`);

        // build out the items to batch write
        const requestItems = [];
        for (const patch of patches) {
            const patchRecord: AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.DevicePatch, patch.patchId),
                        sk: createDelimitedAttribute(PkType.Device, patch.deviceId),
                        si1Sort: createDelimitedAttribute(
                            PkType.DevicePatch,
                            patch.patchStatus,
                            patch.patchId
                        ),
                        si2Hash: createDelimitedAttribute(
                            PkType.PatchTemplate,
                            patch.patchTemplateName,
                            PkType.PatchTemplateVersion,
                            patch.patchTemplate?.versionNo || null
                        ),
                        createdAt: patch.createdAt?.toISOString(),
                        updatedAt: patch.updatedAt?.toISOString(),
                        patchTemplateName: patch.patchTemplateName,
                        patchStatus: patch.patchStatus,
                        patchType: patch.patchType,
                        taskId: patch.taskId,
                        extraVars: patch.extraVars,
                    },
                },
            };

            if (patch.statusMessage) {
                patchRecord.PutRequest.Item.statusMessage = patch.statusMessage;
            }

            requestItems.push(patchRecord);

            const patchTaskRecord: AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.PatchTask, patch.taskId),
                        sk: createDelimitedAttribute(PkType.DevicePatch, patch.patchId),
                        si1Sort: createDelimitedAttribute(PkType.PatchTask, patch.taskId),
                        si2Hash: createDelimitedAttribute(PkType.Device, patch.deviceId),
                    },
                },
            };

            requestItems.push(patchTaskRecord);
        }

        // batch write the items to ddb
        // build the request and write to DynamoDB
        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        params.RequestItems[this.tableName] = requestItems;

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_FAILED');
        }
    }

    public async getBulk(
        patchItems: { patchId: string; deviceId: string }[]
    ): Promise<PatchItem[]> {
        logger.debug(`patch.dao: list: in: patchItems: ${patchItems}`);

        const params = {
            RequestItems: {},
        };

        params.RequestItems[this.tableName] = { Keys: [] };

        for (const item of patchItems) {
            params.RequestItems[this.tableName].Keys.push({
                pk: createDelimitedAttribute(PkType.DevicePatch, item.patchId),
                sk: createDelimitedAttribute(PkType.Device, item.deviceId),
            });

            params.RequestItems[this.tableName].Keys.push({
                pk: createDelimitedAttribute(PkType.DevicePatch, item.patchId),
                sk: createDelimitedAttribute(
                    PkType.DevicePatch,
                    PkType.DevicePatchAssociation,
                    'map'
                ),
            });
        }

        const result = await this.dynamoDbUtils.batchGetAll(params);
        if (
            result.Responses[this.tableName] === undefined ||
            result.Responses[this.tableName].length === 0
        ) {
            logger.debug('patches.dao list: exit: undefined');
            return undefined;
        }

        const patches = this.assemblePatch(result.Responses[this.tableName]);

        logger.debug(`patch.dao: list: exit: patchList: ${JSON.stringify(patches)}`);

        return patches;
    }

    public async get(patchId: string): Promise<PatchItem> {
        logger.debug(`patch.dao: list: in: patchId: ${patchId}`);

        const params = {
            TableName: this.tableName,
            KeyConditionExpression: `#pk=:pk`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.DevicePatch, patchId),
            },
        };

        const result = await this.dc.query(params).promise();
        if (result.Items === undefined || result.Items.length === 0) {
            logger.debug('patches.dao list: exit: undefined');
            return undefined;
        }

        const patches = this.assemblePatch(result.Items);

        logger.debug(`patch.dao: list: exit: patchList: ${JSON.stringify(patches)}`);

        return patches[0];
    }

    public async list(
        deviceId: string,
        status?: string,
        count?: number,
        exclusiveStart?: PatchListPaginationKey
    ): Promise<[PatchItem[], PatchListPaginationKey]> {
        logger.debug(`patch.dao: list: in: patch: ${JSON.stringify(deviceId)}`);

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (exclusiveStart?.nextToken) {
            const decoded = atob(`${exclusiveStart?.nextToken}`);
            exclusiveStartKey = JSON.parse(decoded);
        }

        const params = {
            TableName: this.tableName,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'sk',
                '#sk': 'si1Sort',
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.Device, deviceId),
                ':sk': createDelimitedAttribute(PkType.DevicePatch),
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        if (status) {
            params.ExpressionAttributeValues[':sk'] = createDelimitedAttribute(
                PkType.Device,
                status
            );
        }

        const results = await this.dc.query(params).promise();
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug(`patchTask.dao:getPatchs exit: undefined`);
            return [undefined, undefined];
        }

        const patchItemKeys = results.Items.map((item) => {
            return {
                patchId: expandDelimitedAttribute(item.pk)[1],
                deviceId: expandDelimitedAttribute(item.sk)[1],
            };
        });

        const patches = await this.getBulk(patchItemKeys);

        let paginationKey: PatchListPaginationKey;
        if (results.LastEvaluatedKey) {
            const nextToken = btoa(`${JSON.stringify(results.LastEvaluatedKey)}`);
            paginationKey = {
                nextToken,
            };
        }

        logger.debug(`patch.dao: list: exit: patchList: ${JSON.stringify(patches)}`);

        return [patches, paginationKey];
    }

    public async update(patch: PatchItem): Promise<void> {
        logger.debug(`patch.dao: update: in: patch: ${JSON.stringify(patch)}`);

        let date = new Date().toISOString();

        if (patch.updatedAt && patch.updatedAt instanceof Date) {
            logger.silly(
                `patch.dao: update: using updated at from payload, updatedAt: ${patch.updatedAt}`
            );
            date = patch.updatedAt.toISOString();
        }

        const params = {
            TableName: this.tableName,
            Key: {
                pk: createDelimitedAttribute(PkType.DevicePatch, patch.patchId),
                sk: createDelimitedAttribute(PkType.Device, patch.deviceId),
            },
            UpdateExpression:
                'set patchStatus = :s, statusMessage = :m, updatedAt = :u, patchTemplateName = :t, si1Sort = :si1Sort',
            ExpressionAttributeValues: {
                ':s': patch.patchStatus,
                ':m': patch.statusMessage || null,
                ':u': date,
                ':t': patch.patchTemplateName,
                ':si1Sort': createDelimitedAttribute(
                    PkType.DevicePatch,
                    patch.patchStatus,
                    patch.patchId
                ),
            },
        };

        const result = await this.dc.update(params).promise();

        logger.debug(`patch.dao: save: exit: result: ${JSON.stringify(result)}`);
    }

    public async delete(patchId: string): Promise<void> {
        logger.debug(`patch.dao: delete: in: patch: ${JSON.stringify(patchId)}`);

        // retrieve all records associated with the template
        const queryParams: AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            KeyConditionExpression: `#hash = :hash`,
            ExpressionAttributeNames: { '#hash': 'pk' },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.DevicePatch, patchId),
            },
        };

        const queryResults = await this.dc.query(queryParams).promise();
        if (queryResults.Items === undefined || queryResults.Items.length === 0) {
            logger.debug('patches.dao delete: exit: nothing to delete');
            return;
        }

        // batch delete
        const batchParams: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = { RequestItems: {} };
        batchParams.RequestItems[this.tableName] = [];
        queryResults.Items.forEach((i) => {
            const req: AWS.DynamoDB.DocumentClient.WriteRequest = {
                DeleteRequest: {
                    Key: {
                        pk: i.pk,
                        sk: i.sk,
                    },
                },
            };
            batchParams.RequestItems[this.tableName].push(req);

            const taskreq: AWS.DynamoDB.DocumentClient.WriteRequest = {
                DeleteRequest: {
                    Key: {
                        pk: createDelimitedAttribute(PkType.PatchTask, i.taskId),
                        sk: i.pk,
                    },
                },
            };
            batchParams.RequestItems[this.tableName].push(taskreq);
        });

        const result = await this.dynamoDbUtils.batchWriteAll(batchParams);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('DELETE_FAILED');
        }

        logger.debug(`patch.dao delete: exit:`);
    }

    private assemblePatch(items: AWS.DynamoDB.DocumentClient.ItemList): PatchItem[] {
        const patches: { [patchId: string]: PatchItem } = {};
        const associations: { [patchId: string]: { associationId: string } } = {};
        for (const i of items) {
            const pkElements = i.pk.split(':');
            const skElements = i.sk.split(':');
            const patchId = pkElements[1];

            if (skElements.length === 2 && skElements[0] === PkType.Device) {
                const patch: PatchItem = {
                    deviceId: skElements[1],
                    patchId: pkElements[1],
                    taskId: i.taskId,
                    createdAt: new Date(i.createdAt),
                    updatedAt: new Date(i.updatedAt),
                    patchTemplateName: i.patchTemplateName,
                    patchStatus: i.patchStatus,
                    patchType: i.patchType,
                };

                if (i.statusMessage) {
                    patch.statusMessage = i.statusMessage;
                }

                if (i.extraVars) {
                    patch.extraVars = i.extraVars;
                }
                patches[patchId] = patch;
            } else if (skElements.length === 3 && skElements[0] === PkType.DevicePatch) {
                associations[patchId] = { associationId: i.associationId };
            }
        }
        Object.keys(patches).forEach((patch) => {
            if (associations[patch]) {
                patches[patch].associationId = associations[patch].associationId || null;
            } else {
                patches[patch].associationId = null;
            }
        });

        return Object.values(patches);
    }
}
