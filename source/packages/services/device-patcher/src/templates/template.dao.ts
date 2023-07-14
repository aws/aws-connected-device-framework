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

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { PkType, createDelimitedAttribute, expandDelimitedAttribute } from '../utils/pKUtils.util';

import { PatchTemplateItem } from './template.model';

@injectable()
export class PatchTemplatesDao {
    private readonly SI1_INDEX = 'sk-si1Sort-index';
    private readonly tableName = process.env.AWS_DYNAMODB_TABLE_NAME;

    private dc: AWS.DynamoDB.DocumentClient;

    constructor(
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
        @inject(TYPES.DocumentClientFactory)
        documentClientFactory: () => AWS.DynamoDB.DocumentClient,
    ) {
        this.dc = documentClientFactory();
    }

    public async save(template: PatchTemplateItem): Promise<void> {
        logger.debug(`PatchTemplatesDao create: in: template: ${JSON.stringify(template)}`);

        const templateDbId = createDelimitedAttribute(PkType.PatchTemplate, template.name);

        // create/update the current version record
        const currentRecord: AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: templateDbId,
                    sk: PkType.PatchTemplate,
                    si1Sort: createDelimitedAttribute(
                        PkType.PatchTemplate,
                        template.enabled,
                        template.name,
                    ),
                    createdAt: template.createdAt?.toISOString(),
                    updatedAt: template.updatedAt?.toISOString(),
                    versionNo: template.versionNo,
                    enabled: template.enabled,
                    playbookName: template.playbookName,
                    playbookSource: template.playbookSource,
                    patchType: template.patchType,
                    extraVars: template.extraVars,
                    options: template.options,
                    description: template.description,
                },
            },
        };

        // create the version record
        const versionRecord: AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: templateDbId,
                    sk: createDelimitedAttribute(PkType.PatchTemplateVersion, template.versionNo),
                    createdAt: template.createdAt?.toISOString(),
                    updatedAt: template.updatedAt?.toISOString(),
                    versionNo: template.versionNo,
                },
            },
        };

        // build the request and write to DynamoDB
        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {},
        };
        params.RequestItems[this.tableName] = [versionRecord, currentRecord];

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`PatchTemplateDao: create: exit:`);
    }

    public async get(templateName: string): Promise<PatchTemplateItem> {
        logger.debug(`PatchTemplatesDao get: in: templateName: ${templateName}`);

        const params = {
            TableName: this.tableName,
            KeyConditionExpression: `#hash = :hash AND #range = :range`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#range': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.PatchTemplate, templateName),
                ':range': PkType.PatchTemplate,
            },
        };

        let results;
        try {
            results = await this.dc.query(params).promise();
        } catch (err) {
            throw new Error(err);
        }

        if (results.Items === undefined || results.Items.length === 0) {
            logger.debug('templates.dao get: exit: undefined');
            return undefined;
        }

        const templates = this.assembleTemplateList(results.Items);

        logger.debug(`PatchTemplatesDao get: exit: patchTemplate: ${JSON.stringify(templates)}`);
        return templates[0];
    }

    public async list(
        count?: number,
        lastEvaluated?: TemplateListPaginationKey,
    ): Promise<[PatchTemplateItem[], TemplateListPaginationKey]> {
        logger.debug(
            `templates.dao list: in: count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated,
            )}`,
        );

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (lastEvaluated?.name) {
            exclusiveStartKey = {
                pk: createDelimitedAttribute(PkType.PatchTemplate, lastEvaluated.name),
                siKey1: PkType.PatchTemplate,
                sk: createDelimitedAttribute(PkType.PatchTemplateVersion, 'current'),
            };
        }

        const params: AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#hash = :hash`,
            ExpressionAttributeNames: {
                '#hash': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': PkType.PatchTemplate,
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        logger.silly(`patchTemplates.dao list: params: ${JSON.stringify(params)}`);

        const results = await this.dc.query(params).promise();
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('templates.dao list: exit: undefined');
            return [undefined, undefined];
        }

        logger.silly(`patchTemplates.dao list: results: ${JSON.stringify(results)}`);

        const templates = this.assembleTemplateList(results.Items);
        let paginationKey: TemplateListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedName = expandDelimitedAttribute(results.LastEvaluatedKey.pk)[1];
            paginationKey = {
                name: lastEvaluatedName,
            };
        }

        logger.debug(`templates.dao get: list: response:${JSON.stringify(templates)}`);
        return [templates, paginationKey];
    }

    public async delete(name: string): Promise<void> {
        logger.debug(`templates.dao delete: in: name: ${name}`);

        // retrieve all records associated with the template
        const queryParams: AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            KeyConditionExpression: `#hash = :hash`,
            ExpressionAttributeNames: { '#hash': 'pk' },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.PatchTemplate, name),
            },
        };

        const queryResults = await this.dc.query(queryParams).promise();
        if (queryResults.Items === undefined || queryResults.Items.length === 0) {
            logger.debug('templates.dao delete: exit: nothing to delete');
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
        });

        const result = await this.dynamoDbUtils.batchWriteAll(batchParams);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('DELETE_FAILED');
        }

        logger.debug(`templates.dao delete: exit:`);
    }

    private assembleTemplateList(
        items: AWS.DynamoDB.DocumentClient.ItemList,
    ): PatchTemplateItem[] {
        logger.debug(`templates.dao assembleTemplate: items: ${JSON.stringify(items)}`);

        if ((items?.length ?? 0) === 0) {
            return undefined;
        }

        const t: { [version: string]: PatchTemplateItem } = {};
        items.forEach((i) => {
            const templateName = expandDelimitedAttribute(i.pk)[1];
            const templateVersion = i.versionNo;
            const key = `${templateName}:::${templateVersion}`;

            t[key] = {
                name: templateName,
                playbookName: i.playbookName,
                playbookSource: i.playbookSource,
                patchType: i.patchType,
                extraVars: i.extraVars,
                options: i.options,
                versionNo: i.versionNo,
                createdAt: new Date(i.createdAt),
                updatedAt: new Date(i.updatedAt),
                enabled: i.enabled,
                description: i.description,
            };
        });

        logger.debug(`PatchTemplates.dao assembleTemplate: exit: ${JSON.stringify(items)}`);
        return Object.values(t);
    }
}

export type TemplateListPaginationKey = {
    name: string;
};

export type DynamoDbPaginationKey = { [key: string]: string };
