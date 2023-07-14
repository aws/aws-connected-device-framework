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
import {
    BatchGetCommand,
    BatchGetCommandInput,
    BatchGetCommandOutput,
    BatchWriteCommand,
    BatchWriteCommandInput,
    BatchWriteCommandOutput,
    DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { inject, injectable } from 'inversify';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';

@injectable()
export class DynamoDbUtils {
    private readonly MAX_RETRIES = 3;
    private readonly DEFAULT_MAX_WRITE_BATCH_SIZE = 25;
    private readonly DEFAULT_MAX_GET_BATCH_SIZE = 100;

    private dc: DynamoDBDocumentClient;

    public constructor(
        @inject(TYPES.DynamoDBDocumentFactory) ddcFactory: () => DynamoDBDocumentClient,
    ) {
        this.dc = ddcFactory();
    }

    public hasUnprocessedItems(result: BatchWriteCommandOutput): boolean {
        const has = result !== undefined && result.UnprocessedItems !== undefined;
        return has;
    }

    public hasUnprocesseKeys(result: BatchGetCommandOutput): boolean {
        const has = result !== undefined && result.UnprocessedKeys !== undefined;
        return has;
    }

    public async batchWriteAll(
        params: BatchWriteCommandInput,
        attempt = 1,
    ): Promise<BatchWriteCommandOutput> {
        logger.debug(
            `dynamoDb.util batchWriteAll: in: params:${JSON.stringify(
                params,
            )}, attempt=${attempt}`,
        );

        if (attempt > this.MAX_RETRIES) {
            logger.error(
                `dynamoDb.util batchWriteAll: the following items failed writing:\n${JSON.stringify(
                    params.RequestItems,
                )}`,
            );
            return {
                $metadata: {},
                UnprocessedItems: params.RequestItems,
            };
        }

        // dynamodb max batch size is 25 items, therefore split into smaller chunks if needed...
        const chunks = this.splitBatchWriteIntoChunks(params);

        // now process each chunk, including retries on failed intems...
        while (chunks.length) {
            const chunk = chunks.shift();
            const response = await this.dc.send(new BatchWriteCommand(chunk));
            if (
                response.UnprocessedItems !== undefined &&
                Object.keys(response.UnprocessedItems).length > 0
            ) {
                const retryParams: BatchWriteCommandInput = {
                    RequestItems: response.UnprocessedItems,
                };
                const retryResponse = await this.batchWriteAll(retryParams, attempt++);
                if (
                    retryResponse.UnprocessedItems !== undefined &&
                    Object.keys(retryResponse.UnprocessedItems).length > 0
                ) {
                    // even after max retries we have failed items, therefore return all unprocessed items
                    return this.joinChunksIntoOutputBatchWrite(retryResponse, chunks);
                }
            }
        }

        logger.debug(`dynamoDb.util batchWriteAll: exit:`);
        return undefined;
    }

    public async batchGetAll(
        params: BatchGetCommandInput,
        attempt = 1,
    ): Promise<BatchGetCommandOutput> {
        logger.debug(
            `dynamoDb.util batchGetAll: in: params:${JSON.stringify(params)}, attempt=${attempt}`,
        );

        if (attempt > this.MAX_RETRIES) {
            logger.error(
                `dynamoDb.util batchGetAll: the following items failed writing:\n${JSON.stringify(
                    params.RequestItems,
                )}`,
            );
            return {
                $metadata: {},
                UnprocessedKeys: params.RequestItems,
            };
        }

        // dynamodb max read batch size is 100 items, therefore split into smaller chunks if needed...
        const chunks = this.splitBatchGetIntoChunks(params);
        let response: BatchGetCommandOutput = {
            $metadata: {},
            Responses: {},
        };

        // now process each chunk, including retries on failed intems...
        while (chunks.length) {
            const chunk = chunks.shift();
            const r = await this.dc.send(new BatchGetCommand(chunk));
            response = this.mergeBatchGetOutput(response, {
                $metadata: {},
                Responses: r.Responses,
            });
            if (r.UnprocessedKeys !== undefined && Object.keys(r.UnprocessedKeys).length > 0) {
                const retryParams: BatchGetCommandInput = {
                    RequestItems: r.UnprocessedKeys,
                };
                const retryResponse = await this.batchGetAll(retryParams, attempt++);
                response = this.mergeBatchGetOutput(response, {
                    $metadata: {},
                    Responses: retryResponse.Responses,
                });
            }
        }

        logger.debug(`dynamoDb.util batchGetAll: exit: ${JSON.stringify(response)}`);
        return response;
    }

    private splitBatchWriteIntoChunks(
        batch: BatchWriteCommandInput,
        maxBatchSize?: number,
    ): BatchWriteCommandInput[] {
        logger.debug(
            `dynamoDb.util splitBatchWriteIntoChunks: in: batch:${JSON.stringify(
                batch,
            )}, maxBatchSize:${maxBatchSize}`,
        );

        if (maxBatchSize === undefined) {
            maxBatchSize = this.DEFAULT_MAX_WRITE_BATCH_SIZE;
        }

        // dynamodb max batch size is max 25 items, therefore split into smaller chunks if needed...
        let itemCount = 0;
        Object.keys(batch.RequestItems).forEach(
            (k) => (itemCount += batch.RequestItems[k].length),
        );

        const chunks: BatchWriteCommandInput[] = [];
        if (itemCount > maxBatchSize) {
            let chunkSize = 0;
            let chunk: BatchWriteCommandInput;
            Object.keys(batch.RequestItems).forEach((table) => {
                if (chunk === undefined) {
                    chunk = this.newBatchWriteCommandInput(table);
                } else {
                    chunk.RequestItems[table] = [];
                }
                batch.RequestItems[table].forEach((item) => {
                    if (chunkSize >= maxBatchSize) {
                        // we've exceeded the max batch size, therefore save this and start with a new one
                        chunks.push(chunk);
                        chunk = this.newBatchWriteCommandInput(table);
                        chunkSize = 0;
                    }
                    // add it to the current chunk
                    chunk.RequestItems[table].push(item);
                    chunkSize++;
                });
            });
            chunks.push(chunk);
        } else {
            chunks.push(batch);
        }

        logger.debug(
            `dynamoDb.util splitBatchWriteIntoChunks: exit: chunks:${JSON.stringify(chunks)}`,
        );
        return chunks;
    }

    private splitBatchGetIntoChunks(
        batch: BatchGetCommandInput,
        maxBatchSize?: number,
    ): BatchGetCommandInput[] {
        logger.debug(
            `dynamoDb.util splitBatchGetIntoChunks: in: batch:${JSON.stringify(
                batch,
            )}, maxBatchSize:${maxBatchSize}`,
        );

        if (maxBatchSize === undefined) {
            maxBatchSize = this.DEFAULT_MAX_GET_BATCH_SIZE;
        }

        // dynamodb max get batch size is max 100 items, therefore split into smaller chunks if needed...
        let itemCount = 0;
        Object.keys(batch.RequestItems).forEach(
            (k) => (itemCount += batch.RequestItems[k].Keys.length),
        );

        const chunks: BatchGetCommandInput[] = [];
        if (itemCount > maxBatchSize) {
            let chunkSize = 0;
            let chunk: BatchGetCommandInput;
            Object.keys(batch.RequestItems).forEach((table) => {
                if (chunk === undefined) {
                    chunk = this.newBatchGetCommandInput(table);
                } else {
                    chunk.RequestItems[table] = { Keys: [] };
                }
                batch.RequestItems[table].Keys.forEach((item) => {
                    if (chunkSize >= maxBatchSize) {
                        // we've exceeded the max batch size, therefore save this and start with a new one
                        chunks.push(chunk);
                        chunk = this.newBatchGetCommandInput(table);
                        chunkSize = 0;
                    }
                    // add it to the current chunk
                    chunk.RequestItems[table].Keys.push(item);
                    chunkSize++;
                });
            });
            chunks.push(chunk);
        } else {
            chunks.push(batch);
        }

        logger.debug(
            `dynamoDb.util splitBatchGetIntoChunks: exit: chunks:${JSON.stringify(chunks)}`,
        );
        return chunks;
    }

    public test___splitBatchWriteIntoChunks(
        params: BatchWriteCommandInput,
        maxBatchSize?: number,
    ): BatchWriteCommandInput[] {
        return this.splitBatchWriteIntoChunks(params, maxBatchSize);
    }

    private joinChunksIntoOutputBatchWrite(
        unprocessed: BatchWriteCommandOutput,
        remaining: BatchWriteCommandInput[],
    ): BatchWriteCommandOutput {
        logger.debug(
            `dynamoDb.util joinChunksIntoOutputBatchWrite: in: unprocessed:${JSON.stringify(
                unprocessed,
            )}, remaining:${JSON.stringify(remaining)}`,
        );

        remaining.forEach((chunk) => {
            Object.keys(chunk.RequestItems).forEach((table) => {
                if (unprocessed.UnprocessedItems[table] === undefined) {
                    unprocessed.UnprocessedItems[table] = [];
                }
                unprocessed.UnprocessedItems[table].push(...chunk.RequestItems[table]);
            });
        });

        logger.debug(
            `dynamoDb.util joinChunksIntoOutputBatchWrite: exit: unprocessed:${JSON.stringify(
                unprocessed,
            )}`,
        );
        return unprocessed;
    }

    private mergeBatchGetOutput(
        response: BatchGetCommandOutput,
        toMerge: BatchGetCommandOutput,
    ): BatchGetCommandOutput {
        logger.debug(
            `dynamoDb.util mergeBatchGetOutput: in: response:${JSON.stringify(
                response,
            )}, toMerge:${JSON.stringify(toMerge)}`,
        );

        if (toMerge.Responses) {
            Object.keys(toMerge.Responses).forEach((table) => {
                if (response.Responses[table] === undefined) {
                    response.Responses[table] = [];
                }
                response.Responses[table].push(...toMerge.Responses[table]);
            });
        }

        if (toMerge.UnprocessedKeys) {
            Object.keys(toMerge.UnprocessedKeys).forEach((table) => {
                if (response.UnprocessedKeys[table] === undefined) {
                    response.UnprocessedKeys[table] = { Keys: [] };
                }
                response.UnprocessedKeys[table].Keys.push(...toMerge.UnprocessedKeys[table].Keys);
            });
        }

        logger.debug(`dynamoDb.util mergeBatchGetOutput: exit:${JSON.stringify(response)}`);
        return response;
    }

    public test___joinChunksIntoOutputBatchWrite(
        unprocessed: BatchWriteCommandOutput,
        remaining: BatchWriteCommandInput[],
    ): BatchWriteCommandOutput {
        return this.joinChunksIntoOutputBatchWrite(unprocessed, remaining);
    }

    private newBatchWriteCommandInput(table?: string): BatchWriteCommandInput {
        const r: BatchWriteCommandInput = {
            RequestItems: {},
        };
        if (table !== undefined) {
            r.RequestItems[table] = [];
        }
        return r;
    }

    private newBatchGetCommandInput(table?: string): BatchGetCommandInput {
        const r: BatchGetCommandInput = {
            RequestItems: {},
        };
        if (table !== undefined) {
            r.RequestItems[table] = {
                Keys: [],
            };
        }
        return r;
    }
}
export interface DocumentDbClientItem {
    [key: string]: NativeAttributeValue;
}
