/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { injectable, inject } from 'inversify';
import {logger} from './logger.util';
import { TYPES } from '../di/types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@injectable()
export class DynamoDbUtils {

    private readonly MAX_RETRIES=3;
    private readonly DEFAULT_MAX_WRITE_BATCH_SIZE=25;
    private readonly DEFAULT_MAX_GET_BATCH_SIZE=100;

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public putAttributeIfDefined(writeRequest:AWS.DynamoDB.DocumentClient.WriteRequest, key:string, value:any) {
        if (value!==undefined) {
            writeRequest.PutRequest.Item[key] = value;
        }
    }

    public hasUnprocessedItems(result:AWS.DynamoDB.DocumentClient.BatchWriteItemOutput):boolean {
        const has = result!==undefined && result.UnprocessedItems!==undefined;
        return has;
    }

    public hasUnprocesseKeys(result:AWS.DynamoDB.DocumentClient.BatchGetItemOutput):boolean {
        const has = result!==undefined && result.UnprocessedKeys!==undefined;
        return has;
    }

    public async batchWriteAll(params:AWS.DynamoDB.DocumentClient.BatchWriteItemInput, attempt:number=1) : Promise<AWS.DynamoDB.DocumentClient.BatchWriteItemOutput> {
        logger.debug(`dynamoDb.util batchWriteAll: in: params:${JSON.stringify(params)}, attempt=${attempt}`);

        if (attempt>this.MAX_RETRIES) {
            logger.error(`dynamoDb.util batchWriteAll: the following items failed writing:\n${JSON.stringify(params.RequestItems)}`);
            return params.RequestItems;
        }

        // dynamodb max batch size is 25 items, therefore split into smaller chunks if needed...
        const chunks = this.splitBatchWriteIntoChunks(params);

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
                    return this.joinChunksIntoOutputBatchWrite(retryResponse, chunks);
                }
            }
        }

        logger.debug(`dynamoDb.util batchWriteAll: exit:`);
        return undefined;

    }

    public async batchGetAll(params:AWS.DynamoDB.DocumentClient.BatchGetItemInput, attempt:number=1) : Promise<AWS.DynamoDB.DocumentClient.BatchGetItemOutput> {
        logger.debug(`dynamoDb.util batchGetAll: in: params:${JSON.stringify(params)}, attempt=${attempt}`);

        if (attempt>this.MAX_RETRIES) {
            logger.error(`dynamoDb.util batchGetAll: the following items failed writing:\n${JSON.stringify(params.RequestItems)}`);
            return params.RequestItems;
        }

        // dynamodb max read batch size is 100 items, therefore split into smaller chunks if needed...
        const chunks = this.splitBatchGetIntoChunks(params);
        let response:AWS.DynamoDB.DocumentClient.BatchGetItemOutput = {Responses: {}};

        // now process each chunk, including retries on failed intems...
        while(chunks.length) {
            const chunk = chunks.shift();
            const r = await this._dc.batchGet(chunk).promise();
            response = this.mergeBatchGetOutput(response, {Responses: r.Responses});
            if (r.UnprocessedKeys!==undefined && Object.keys(r.UnprocessedKeys).length>0) {
                const retryParams: DocumentClient.BatchGetItemInput = {
                    RequestItems: r.UnprocessedKeys
                };
                const retryResponse = await this.batchGetAll(retryParams, attempt++);
                response = this.mergeBatchGetOutput(response, {Responses: retryResponse.Responses});
            }
        }

        logger.debug(`dynamoDb.util batchGetAll: exit: ${JSON.stringify(response)}`);
        return response;
    }

    private splitBatchWriteIntoChunks(batch:AWS.DynamoDB.DocumentClient.BatchWriteItemInput, maxBatchSize?:number) : AWS.DynamoDB.DocumentClient.BatchWriteItemInput[] {
        logger.debug(`dynamoDb.util splitBatchWriteIntoChunks: in: batch:${JSON.stringify(batch)}, maxBatchSize:${maxBatchSize}`);

        if (maxBatchSize===undefined) {
            maxBatchSize=this.DEFAULT_MAX_WRITE_BATCH_SIZE;
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

        logger.debug(`dynamoDb.util splitBatchWriteIntoChunks: exit: chunks:${JSON.stringify(chunks)}`);
        return chunks;
    }

    private splitBatchGetIntoChunks(batch:AWS.DynamoDB.DocumentClient.BatchGetItemInput, maxBatchSize?:number) : AWS.DynamoDB.DocumentClient.BatchGetItemInput[] {
        logger.debug(`dynamoDb.util splitBatchGetIntoChunks: in: batch:${JSON.stringify(batch)}, maxBatchSize:${maxBatchSize}`);

        if (maxBatchSize===undefined) {
            maxBatchSize=this.DEFAULT_MAX_GET_BATCH_SIZE;
        }

        // dynamodb max get batch size is max 100 items, therefore split into smaller chunks if needed...
        let itemCount=0;
        Object.keys(batch.RequestItems).forEach(k=> itemCount+=batch.RequestItems[k].Keys.length);

        const chunks:AWS.DynamoDB.DocumentClient.BatchGetItemInput[]= [];
        if (itemCount>maxBatchSize) {
            let chunkSize=0;
            let chunk:AWS.DynamoDB.DocumentClient.BatchGetItemInput;
            Object.keys(batch.RequestItems).forEach(table=> {
                if (chunk===undefined) {
                    chunk=this.newBatchGetItemInput(table);
                } else {
                    chunk.RequestItems[table]= {Keys:[]};
                }
                batch.RequestItems[table].Keys.forEach(item=> {
                    if (chunkSize>=maxBatchSize) {
                        // we've exceeded the max batch size, therefore save this and start with a new one
                        chunks.push(chunk);
                        chunk=this.newBatchGetItemInput(table);
                        chunkSize=0;
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

        logger.debug(`dynamoDb.util splitBatchGetIntoChunks: exit: chunks:${JSON.stringify(chunks)}`);
        return chunks;
    }

    public test___splitBatchWriteIntoChunks(params:AWS.DynamoDB.DocumentClient.BatchWriteItemInput, maxBatchSize?:number) : AWS.DynamoDB.DocumentClient.BatchWriteItemInput[] {
        return this.splitBatchWriteIntoChunks(params, maxBatchSize);
    }

    private joinChunksIntoOutputBatchWrite(unprocessed:AWS.DynamoDB.DocumentClient.BatchWriteItemOutput, remaining:AWS.DynamoDB.DocumentClient.BatchWriteItemInput[]) : AWS.DynamoDB.DocumentClient.BatchWriteItemOutput {
        logger.debug(`dynamoDb.util joinChunksIntoOutputBatchWrite: in: unprocessed:${JSON.stringify(unprocessed)}, remaining:${JSON.stringify(remaining)}`);

        remaining.forEach(chunk=> {
            Object.keys(chunk.RequestItems).forEach(table=> {
                if (unprocessed.UnprocessedItems[table]===undefined) {
                    unprocessed.UnprocessedItems[table]= [];
                }
                unprocessed.UnprocessedItems[table].push(...chunk.RequestItems[table]);
            });
        });

        logger.debug(`dynamoDb.util joinChunksIntoOutputBatchWrite: exit: unprocessed:${JSON.stringify(unprocessed)}`);
        return unprocessed;
    }

    private mergeBatchGetOutput(response:AWS.DynamoDB.DocumentClient.BatchGetItemOutput, toMerge:AWS.DynamoDB.DocumentClient.BatchGetItemOutput) : AWS.DynamoDB.DocumentClient.BatchGetItemOutput {

        logger.debug(`dynamoDb.util mergeBatchGetOutput: in: response:${JSON.stringify(response)}, toMerge:${JSON.stringify(toMerge)}`);

        if (toMerge.Responses) {
            Object.keys(toMerge.Responses).forEach(table=> {
                if (response.Responses[table]===undefined) {
                    response.Responses[table]= [];
                }
                response.Responses[table].push(...toMerge.Responses[table]);
            });
        }

        if (toMerge.UnprocessedKeys) {
            Object.keys(toMerge.UnprocessedKeys).forEach(table=> {
                if (response.UnprocessedKeys[table]===undefined) {
                    response.UnprocessedKeys[table]= {Keys:[]};
                }
                response.UnprocessedKeys[table].Keys.push(...toMerge.UnprocessedKeys[table].Keys);
            });

        }

        logger.debug(`dynamoDb.util mergeBatchGetOutput: exit:${JSON.stringify(response)}`);
        return response;
    }

    public test___joinChunksIntoOutputBatchWrite(unprocessed:AWS.DynamoDB.DocumentClient.BatchWriteItemOutput, remaining:AWS.DynamoDB.DocumentClient.BatchWriteItemInput[]) : AWS.DynamoDB.DocumentClient.BatchWriteItemOutput {
        return this.joinChunksIntoOutputBatchWrite(unprocessed, remaining);
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

    private newBatchGetItemInput(table?:string) : AWS.DynamoDB.DocumentClient.BatchGetItemInput {
        const r:DocumentClient.BatchGetItemInput = {
            RequestItems: {}
        };
        if (table!==undefined) {
            r.RequestItems[table]= {
                Keys: []
            };
        }
        return r;
    }

}
