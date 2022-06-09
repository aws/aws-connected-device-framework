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
import { Response } from './responses.models';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {TYPES} from '../di/types';
import { createDelimitedAttribute, PkType } from '../utils/pkUtils.util';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

@injectable()
export class ResponsesDao {

    private _dc: DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.table') private table:string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async save(messageId: string, reply:Response): Promise<void> {
        logger.debug(`responses.dao save: in: messageId:${messageId}, reply:${JSON.stringify(reply)}`);

        const now = (reply.timestamp) ? reply.timestamp : (new Date()).getTime();

        const params: AWS.DynamoDB.DocumentClient.PutItemInput = {
            TableName: this.table,
            Item: {
                pk: createDelimitedAttribute(PkType.Message, messageId),
                sk: createDelimitedAttribute(PkType.Reply, PkType.Thing, reply.thingName, now),
                thingName: reply.thingName,
                createdAt: now
            }
        };
        this.dynamoDbUtils.putAttributeIfDefined(params.Item, 'payload', reply.payload);
        this.dynamoDbUtils.putAttributeIfDefined(params.Item, 'action', reply.action);

        logger.silly(`responses.dao save create: params:${JSON.stringify(params)}`);
        const r = await this._dc.put(params).promise();
        logger.silly(`responses.dao save create: r:${JSON.stringify(r)}`);

        logger.debug(`responses.dao save create: exit:`);

    }
}
