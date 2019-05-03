import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import { TYPES } from '../di/types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@injectable()
export class DynamoDbUtils {

    private readonly MAX_RETRIES=3;

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
        logger.debug(`dynamoDb batchWriteAll: in: params:${JSON.stringify(params)}, attempt=${attempt}`);

        if (attempt>this.MAX_RETRIES) {
            logger.error(`dynamoDb batchWriteAll: the following items failed writing:\n${JSON.stringify(params.RequestItems)}`);
            return params.RequestItems;
        }

        const response = await this._dc.batchWrite(params).promise();

        if (response.UnprocessedItems!==undefined && Object.keys(response.UnprocessedItems).length>0) {
            const retryParams: DocumentClient.BatchWriteItemInput = {
                RequestItems: response.UnprocessedItems
            };
            return await this.batchWriteAll(retryParams, attempt++);
        }

        logger.debug(`dynamoDb batchWriteAll: exit:`);
        return response;

    }
}
