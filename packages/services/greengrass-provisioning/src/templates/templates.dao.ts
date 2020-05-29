/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {TYPES} from '../di/types';
import { TemplateItem, TemplateItemList } from './templates.models';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { createDelimitedAttribute, PkType, expandDelimitedAttribute } from '../utils/pkUtils.util';

@injectable()
export class TemplatesDao {

    private readonly SI1_INDEX = 'sk-si1Sort-index';

    private dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.table') private table:string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async save(item:TemplateItem) : Promise<void> {
        logger.debug(`templates.dao save: in: item: ${JSON.stringify(item)}`);

        const templateDbId = createDelimitedAttribute(PkType.GroupTemplate, item.name);

        // create/update the current version record
        const currentRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: templateDbId,
                    sk:  PkType.GroupTemplate,
                    si1Sort: createDelimitedAttribute(PkType.GroupTemplate, item.enabled, item.name),
                    groupId: item.groupId,
                    groupVersionId: item.groupVersionId,
                    createdAt: item.createdAt?.toISOString(),
                    updatedAt: item.updatedAt?.toISOString(),
                    versionNo: item.versionNo,
                    enabled: item.enabled
                }
            }
        };

        // create the version record
        const versionRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: templateDbId,
                    sk:  createDelimitedAttribute(PkType.GroupTemplateVersion, item.versionNo),
                    groupId: item.groupId,
                    groupVersionId: item.groupVersionId,
                    createdAt: item.createdAt?.toISOString(),
                    updatedAt: item.updatedAt?.toISOString(),
                    versionNo: item.versionNo,
                }
            }
        };

        // build the request and write to DynamoDB
        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.table]=[versionRecord, currentRecord];

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`templates.dao save: exit:`);
    }

    public async get(name:string) : Promise<TemplateItem> {
        logger.debug(`templates.dao get: in: name: ${name}`);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.table,
            KeyConditionExpression: `#hash = :hash AND #range = :range`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#range': 'sk'
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.GroupTemplate, name),
                ':range': PkType.GroupTemplate
            }
        };

        const results = await this.dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('templates.dao get: exit: undefined');
            return undefined;
        }

        const templates = this.assembleTemplateList(results.Items);

        logger.debug(`templates.dao get: exit: response:${JSON.stringify(templates.templates[0])}`);
        return templates.templates[0];
    }

    public async list() : Promise<TemplateItemList> {
        logger.debug(`templates.dao list: in:`);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.table,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#hash = :hash`,
            ExpressionAttributeNames: {
                '#hash': 'sk'
            },
            ExpressionAttributeValues: {
                ':hash': PkType.GroupTemplate
            }
        };

        const results = await this.dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('templates.dao list: exit: undefined');
            return undefined;
        }

        const templates = this.assembleTemplateList(results.Items);
        logger.debug(`templates.dao get: list: response:${JSON.stringify(templates)}`);
        return templates;
    }

    private assembleTemplateList(results:AWS.DynamoDB.DocumentClient.ItemList) : TemplateItemList {
        logger.debug(`templates.dao assembleTemplate: items: ${JSON.stringify(results)}`);

        const templates = new TemplateItemList();
        for(const i of results) {

            const name = expandDelimitedAttribute(i.pk)[1];

            const template:TemplateItem = {
                name,
                versionNo: i.versionNo,
                groupId: i.groupId,
                groupVersionId: i.groupVersionId,
                createdAt: new Date(i.createdAt),
                updatedAt: new Date(i.updatedAt),
                enabled: i.enabled
            } ;

            templates.templates.push(template);
        }

        logger.debug(`templates.dao assembleTemplate: exit: ${JSON.stringify(templates)}`);
        return templates;
    }
}
