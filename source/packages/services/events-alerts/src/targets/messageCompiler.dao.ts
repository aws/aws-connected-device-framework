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
import { injectable, inject } from 'inversify';
import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import {
    createDelimitedAttribute,
    PkType,
    createDelimitedAttributePrefix,
} from '../utils/dynamoDb.util';
import { MessageTemplates } from './messageCompiler.model';

@injectable()
export class MessageCompilerDao {
    private _cachedDc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable: string,
        @inject('aws.dynamoDb.tables.eventConfig.gsi1') private eventConfigGSI1: string,
        @inject(TYPES.CachableDocumentClientFactory)
        cachableDocumentClientFactory: () => AWS.DynamoDB.DocumentClient,
    ) {
        this._cachedDc = cachableDocumentClientFactory();
    }

    public async getEventConfig(eventId: string): Promise<MessageTemplates> {
        logger.debug(`messageCompiler.dao getEventConfig: in: eventId:${eventId}`);

        const queryParams: DocumentClient.QueryInput = {
            TableName: this.eventConfigTable,
            IndexName: this.eventConfigGSI1,
            KeyConditionExpression: `#sk = :sk AND begins_with( #gsi1Sort, :gsi1Sort )`,
            ExpressionAttributeNames: {
                '#sk': 'sk',
                '#gsi1Sort': 'gsi1Sort',
            },
            ExpressionAttributeValues: {
                ':sk': createDelimitedAttribute(PkType.Event, eventId),
                ':gsi1Sort': createDelimitedAttributePrefix(PkType.Event, eventId),
            },
        };

        const results = await this._cachedDc.query(queryParams).promise();

        if (results.Items === undefined || results.Items.length === 0) {
            logger.error(`messageCompiler.dao getEventConfig: unknown eventId: ${eventId}`);
            return undefined;
        }
        const templates = new MessageTemplates();
        const i = results.Items[0];
        templates.supportedTargets = i.supportedTargets;
        templates.templates = i.templates;
        templates.eventId = eventId;

        logger.debug(`messageCompiler.dao getEventConfig: exit:${JSON.stringify(templates)}`);
        return templates;
    }
}
