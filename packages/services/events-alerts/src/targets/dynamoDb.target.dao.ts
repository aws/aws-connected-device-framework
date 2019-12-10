/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger.util';
import { TYPES } from '../di/types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@injectable()
export class DynamoDbTargetDao {

    private readonly MAX_RETRIES=3;
    private readonly DEFAULT_MAX_BATCH_SIZE=25;

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public hasUnprocessedItems(result:AWS.DynamoDB.DocumentClient.BatchWriteItemOutput):boolean {
        const has = result!==undefined && result.UnprocessedItems!==undefined;
        return has;
    }

    public async batchWriteAll(params:AWS.DynamoDB.DocumentClient.BatchWriteItemInput, attempt:number=1) : Promise<AWS.DynamoDB.DocumentClient.BatchWriteItemOutput> {
        logger.debug(`dynamoDb.util batchWriteAll: in: params:${JSON.stringify(params)}, attempt=${attempt}`);

        if (attempt>this.MAX_RETRIES) {
            logger.error(`dynamoDb.util batchWriteAll: the following items failed writing:\n${JSON.stringify(params.RequestItems)}`);
            return params.RequestItems;
        }

        // dynamodb max batch size is 25 items, therefore split into smaller chunks if needed...
        const chunks = this.splitBatchIntoChunks(params);

        // now process each chunk, including retries on failed intems...
        while(chunks.length) {
            const chunk = chunks.shift();
            const response = await this._dc.batchWrite(chunk).promise();
            if (response.UnprocessedItems!==undefined && Object.keys(response.UnprocessedItems).length>0) {
                const retryParams: DocumentClient.BatchWriteItemInput = {
                    RequestItems: response.UnprocessedItems
                };
                const retryResponse = await this.batchWriteAll(retryParams, attempt++);
                if (retryResponse.UnprocessedItems!==undefined && Object.keys(retryResponse.UnprocessedItems).length>0) {
                    // even after max retries we have failed items, therefore return all unprocessed items
                    return this.joinChunksIntoOutputBatch(retryResponse, chunks);
                }
            }
        }

        logger.debug(`dynamoDb.util batchWriteAll: exit:`);
        return undefined;

    }

    private splitBatchIntoChunks(batch:AWS.DynamoDB.DocumentClient.BatchWriteItemInput, maxBatchSize?:number) : AWS.DynamoDB.DocumentClient.BatchWriteItemInput[] {
        logger.debug(`dynamoDb.util splitBatchIntoChunks: in: batch:${JSON.stringify(batch)}, maxBatchSize:${maxBatchSize}`);

        if (maxBatchSize===undefined) {
            maxBatchSize=this.DEFAULT_MAX_BATCH_SIZE;
        }

        // dynamodb max batch size is max 25 items, therefore split into smaller chunks if needed...
        let itemCount=0;
        Object.keys(batch.RequestItems).forEach(k=> itemCount+=batch.RequestItems[k].length);

        const chunks:AWS.DynamoDB.DocumentClient.BatchWriteItemInput[]= [];
        if (itemCount>maxBatchSize) {
            let chunkSize=0;
            let chunk:AWS.DynamoDB.DocumentClient.BatchWriteItemInput;
            Object.keys(batch.RequestItems).forEach(table=> {
                if (chunk===undefined) {
                    chunk=this.newBatchWriteItemInput(table);
                } else {
                    chunk.RequestItems[table]= [];
                }
                batch.RequestItems[table].forEach(item=> {
                    if (chunkSize>=maxBatchSize) {
                        // we've exceeded the max batch size, therefore save this and start with a new one
                        chunks.push(chunk);
                        chunk=this.newBatchWriteItemInput(table);
                        chunkSize=0;
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

        logger.debug(`dynamoDb.util splitBatchIntoChunks: exit: chunks:${JSON.stringify(chunks)}`);
        return chunks;
    }

    public test___splitBatchIntoChunks(params:AWS.DynamoDB.DocumentClient.BatchWriteItemInput, maxBatchSize?:number) : AWS.DynamoDB.DocumentClient.BatchWriteItemInput[] {
        return this.splitBatchIntoChunks(params, maxBatchSize);
    }

    private joinChunksIntoOutputBatch(unprocessed:AWS.DynamoDB.DocumentClient.BatchWriteItemOutput, remaining:AWS.DynamoDB.DocumentClient.BatchWriteItemInput[]) : AWS.DynamoDB.DocumentClient.BatchWriteItemOutput {
        logger.debug(`dynamoDb.util joinChunksIntoOutputBatch: in: unprocessed:${JSON.stringify(unprocessed)}, remaining:${JSON.stringify(remaining)}`);

        remaining.forEach(chunk=> {
            Object.keys(chunk.RequestItems).forEach(table=> {
                if (unprocessed.UnprocessedItems[table]===undefined) {
                    unprocessed.UnprocessedItems[table]= [];
                }
                unprocessed.UnprocessedItems[table].push(...chunk.RequestItems[table]);
            });
        });

        logger.debug(`dynamoDb.util splitBatchIntoChunks: exit: unprocessed:${JSON.stringify(unprocessed)}`);
        return unprocessed;
    }

    public test___joinChunksIntoOutputBatch(unprocessed:AWS.DynamoDB.DocumentClient.BatchWriteItemOutput, remaining:AWS.DynamoDB.DocumentClient.BatchWriteItemInput[]) : AWS.DynamoDB.DocumentClient.BatchWriteItemOutput {
        return this.joinChunksIntoOutputBatch(unprocessed, remaining);
    }

    private newBatchWriteItemInput(table?:string) : AWS.DynamoDB.DocumentClient.BatchWriteItemInput {
        const r:DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        if (table!==undefined) {
            r.RequestItems[table]= [];
        }
        return r;
    }
}
