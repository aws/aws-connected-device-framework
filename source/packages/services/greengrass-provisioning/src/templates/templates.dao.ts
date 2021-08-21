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
        this.dynamoDbUtils.putAttributeIfDefined(currentRecord, 'subscriptions', item.subscriptions);

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
        this.dynamoDbUtils.putAttributeIfDefined(versionRecord, 'subscriptions', item.subscriptions);

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

    public async get(name:string, versionNo?:number) : Promise<TemplateItem> {
        logger.debug(`templates.dao get: in: name: ${name}, versionNo: ${versionNo}`);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.table,
            KeyConditionExpression: `#hash = :hash AND #range = :range`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#range': 'sk'
            }
        };

        if (versionNo!==undefined) {
            // return a specific version
            params.ExpressionAttributeValues= {
                ':hash': createDelimitedAttribute(PkType.GroupTemplate, name),
                ':range': createDelimitedAttribute(PkType.GroupTemplateVersion, versionNo)
            }
        } else {
            // return the latest version
            params.ExpressionAttributeValues= {
                ':hash': createDelimitedAttribute(PkType.GroupTemplate, name),
                ':range': PkType.GroupTemplate
            }
        }

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

    public async delete(name:string) : Promise<void> {
        logger.debug(`templates.dao delete: in: name: ${name}`);

        // retrieve all records associated with the template
        const queryParams:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.table,
            KeyConditionExpression: `#hash = :hash`,
            ExpressionAttributeNames: {'#hash': 'pk'},
            ExpressionAttributeValues: {':hash': createDelimitedAttribute(PkType.GroupTemplate, name)}
        };

        const queryResults = await this.dc.query(queryParams).promise();
        if (queryResults.Items===undefined || queryResults.Items.length===0) {
            logger.debug('templates.dao delete: exit: nothing to delete');
            return ;
        }

        // batch delete
        const batchParams: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {RequestItems: {}};
        batchParams.RequestItems[this.table]=[];
        queryResults.Items.forEach(i=> {
            const req : AWS.DynamoDB.DocumentClient.WriteRequest = {
                DeleteRequest: {
                    Key: {
                        'pk': i.pk,
                        'sk': i.sk
                    }
                }
            }
            batchParams.RequestItems[this.table].push(req);
        })

        const result = await this.dynamoDbUtils.batchWriteAll(batchParams);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('DELETE_FAILED');
        }

        logger.debug(`templates.dao delete: exit:`);
    }

    private assembleTemplateList(results:AWS.DynamoDB.DocumentClient.ItemList) : TemplateItemList {
        logger.debug(`templates.dao assembleTemplate: items: ${JSON.stringify(results)}`);

        const templates:TemplateItemList= {templates:[]};
        for(const i of results) {

            const name = expandDelimitedAttribute(i.pk)[1];

            const template:TemplateItem = {
                name,
                versionNo: i.versionNo,
                groupId: i.groupId,
                groupVersionId: i.groupVersionId,
                subscriptions: i.subscriptions,
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
