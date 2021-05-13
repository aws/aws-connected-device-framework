/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {TYPES} from '../di/types';
import { GroupItemList, GroupItem } from './groups.models';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { createDelimitedAttribute, createDelimitedAttributePrefix, PkType } from '../utils/pkUtils.util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { Pagination } from '../common/common.models';
import btoa from 'btoa';
import atob from 'atob';

@injectable()
export class GroupsDao {

    private readonly SI3_INDEX = 'templateName-si1Sort-index';

    private dc:DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.table') private tableName:string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async listByTemplate(name:string, versionNo?:number, pagination?:Pagination) : Promise<GroupItemList> {
        logger.debug(`groups.dao listByTemplate: in: name:${name}, versionNo:${versionNo}, pagination:${JSON.stringify(pagination)}`);


        // apply pagination if provided
        let exclusiveStartKey:DocumentClient.Key;
        if (pagination?.token) {
            exclusiveStartKey= JSON.parse(atob(pagination.token)) as DocumentClient.Key;
        }

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            IndexName: this.SI3_INDEX,
            KeyConditionExpression: '#hash = :hash',
            ExpressionAttributeNames: {
                '#hash': 'templateName'
            },
            ExpressionAttributeValues: {
                ':hash': name
            },
            Limit: pagination?.limit,
            ExclusiveStartKey: exclusiveStartKey,
            ScanIndexForward: true
        };

        if (versionNo!==undefined) {
            params.KeyConditionExpression = '#hash = :hash AND begins_with(#range, :range)',
            params.ExpressionAttributeNames['#range'] = 'si1Sort';
            params.ExpressionAttributeValues[':range'] = createDelimitedAttributePrefix(PkType.GroupTemplate, name, PkType.GroupTemplateVersion, versionNo, PkType.GreengrassGroup);

        }

        logger.debug(`groups.dao listByTemplate: params:${JSON.stringify(params)}`);
        const results = await this.dc.query(params).promise();
        logger.debug(`groups.dao listByTemplate: results:${JSON.stringify(results)}`);
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('groups.dao listByTemplate: exit: undefined');
            return undefined;
        }

        const templates = this.assemble(results);
        logger.debug(`groups.dao listByTemplate: response:${JSON.stringify(templates)}`);
        return templates;
    }

    private buildGroupItemRequest(item:GroupItem) : AWS.DynamoDB.DocumentClient.WriteRequest[] {
        logger.debug(`groups.dao buildGroupItemRequest: in: item: ${JSON.stringify(item)}`);

        const groupDbId = createDelimitedAttribute(PkType.GreengrassGroup, item.name);

        // create/update the current group item
        const currentRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: groupDbId,
                    sk:  groupDbId,
                    si1Sort: createDelimitedAttribute(PkType.GroupTemplate, item.templateName, PkType.GroupTemplateVersion, item.templateVersionNo, PkType.GreengrassGroup, item.name),
                    templateName: item.templateName,
                    templateVersionNo: item.templateVersionNo,
                    groupId: item.id,
                    groupVersionId: item.versionId,
                    versionNo: item.versionNo,
                    deployed: item.deployed,
                    arn: item.arn,
                    createdAt: item.createdAt?.toISOString(),
                    updatedAt: item.updatedAt?.toISOString()
                }
            }
        };

        // create/update the group version item
        const versionRecord = JSON.parse(JSON.stringify(currentRecord));
        versionRecord.PutRequest.Item['sk'] = createDelimitedAttribute(PkType.GreengrassGroupVersion, item.versionNo);
        delete  versionRecord.PutRequest.Item['si1Sort'];

        // create/update the group id>name mapping
        const idNameMapRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: createDelimitedAttribute(PkType.GreengrassGroupId, item.id),
                    sk:  createDelimitedAttribute(PkType.GreengrassGroupId, PkType.GreengrassGroup, 'map'),
                    groupName: item.name
                }
            }
        };

        logger.debug(`groups.dao buildGroupItemRequest: exit: ${JSON.stringify([currentRecord, versionRecord, idNameMapRecord])}`);
        return [currentRecord, versionRecord, idNameMapRecord];

    }

    public async saveGroup(item:GroupItem) : Promise<void> {
        logger.debug(`groups.dao saveGroup: in: item: ${JSON.stringify(item)}`);

        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.tableName]= [];
        params.RequestItems[this.tableName].push(...this.buildGroupItemRequest(item));

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            logger.error(`groups.dao saveGroup: unprocessed: ${JSON.stringify(result.UnprocessedItems)}`);
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`groups.dao saveGroup: exit:`);
    }

    public async saveGroups(items:GroupItemList) : Promise<void> {
        logger.debug(`groups.dao saveGroups: in: items: ${JSON.stringify(items)}`);

        if (items.groups.length===0) {
            logger.error(`groups.dao saveGroups: exit: nothing to save`);
            return;
        }

        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.tableName]= [];

        for(const item of items.groups) {
            params.RequestItems[this.tableName].push(...this.buildGroupItemRequest(item));
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            logger.error(`groups.dao saveGroups: unprocessed: ${JSON.stringify(result.UnprocessedItems)}`);
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`groups.dao saveGroups: exit:`);
    }

    public async get(groupName:string, versionNo?:number) : Promise<GroupItem> {
        logger.debug(`groups.dao get: in: groupName:${groupName}, versionNo:${versionNo}`);

        const pk = createDelimitedAttribute(PkType.GreengrassGroup, groupName);

        const skExpression = versionNo ? createDelimitedAttribute(PkType.GreengrassGroupVersion, versionNo) : pk ;

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            KeyConditionExpression: `#pk=:pk AND #sk=:sk`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
                '#sk': 'sk'
            },
            ExpressionAttributeValues: {
                ':pk': pk,
                ':sk': skExpression
            }
        };

        const results = await this.dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('groups.dao get: exit: undefined');
            return undefined;
        }

        const groupList = this.assemble(results);
        const group = groupList.groups[0];
        logger.debug(`groups.dao get: exit: ${JSON.stringify(group)}`);
        return group;
    }

    public async delete(name:string) : Promise<void> {
        logger.debug(`groups.dao delete: in: name: ${name}`);

        // retrieve all records associated with the group
        const queryParams:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            KeyConditionExpression: `#hash = :hash`,
            ExpressionAttributeNames: {'#hash': 'pk'},
            ExpressionAttributeValues: {':hash': createDelimitedAttribute(PkType.GreengrassGroup, name)}
        };

        const queryResults = await this.dc.query(queryParams).promise();
        if (queryResults.Items===undefined || queryResults.Items.length===0) {
            logger.debug('groups.dao delete: exit: nothing to delete');
            return ;
        }

        // batch delete
        const batchParams: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {RequestItems: {}};
        batchParams.RequestItems[this.tableName]=[];
        queryResults.Items.forEach(i=> {
            const req : AWS.DynamoDB.DocumentClient.WriteRequest = {
                DeleteRequest: {
                    Key: {
                        'pk': i.pk,
                        'sk': i.sk
                    }
                }
            }
            batchParams.RequestItems[this.tableName].push(req);
        })

        const result = await this.dynamoDbUtils.batchWriteAll(batchParams);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('DELETE_FAILED');
        }

        logger.debug(`groups.dao delete: exit:`);
    }

    public async getNames(groupIds:string[]) : Promise<{[id:string]:string}> {
        logger.debug(`groups.dao getNames: in: groupIds:${JSON.stringify(groupIds)}`);

        const groupNames:{[id:string]: string}= {};

        const params: AWS.DynamoDB.DocumentClient.BatchGetItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.tableName]= {
            Keys: []
        };
        groupIds.forEach(id=> params.RequestItems[this.tableName].Keys.push({
            pk: createDelimitedAttribute(PkType.GreengrassGroupId, id),
            sk: createDelimitedAttribute(PkType.GreengrassGroupId, PkType.GreengrassGroup, 'map')
        }));

        const result = await this.dynamoDbUtils.batchGetAll(params);
        logger.debug(`groups.dao getNames: result:${JSON.stringify(result)}`);

        if (this.dynamoDbUtils.hasUnprocesseKeys(result)) {
            throw new Error('GET_NAMES_FAILED');
        }

        if (result?.Responses?.[this.tableName]) {
            result.Responses[this.tableName].forEach(i=> {
                const groupId = i['pk'].split(':')[1];
                groupNames[groupId] = i['groupName'];
            });
        }

        logger.debug(`groups.dao getNames: exit: ${JSON.stringify(groupNames)}`);
        return groupNames;
    }

    private assemble(results:DocumentClient.QueryOutput) : GroupItemList {
        logger.debug(`groups.dao assemble: results: ${JSON.stringify(results)}`);

        const res = new GroupItemList();

        if (results.Items===undefined) {
            logger.debug('groups.dao assemble: exit: results:undefined');
            return res;
        }

        for(const i of results.Items) {

            const pkElements = i.pk.split(':');

            if (pkElements.length!==2 && i.sk!==PkType.GreengrassGroup) {
                logger.warn(`groups.dao assemble: skipping pk ${i.pk}, sk ${i.sk} as not recognized`);
                continue;
            }

            const item = new GroupItem();
            item.name = pkElements[1];
            item.templateName = i.templateName;
            item.templateVersionNo = i.templateVersionNo;
            item.id = i.groupId;
            item.arn = i.arn;
            item.versionId = i.groupVersionId;
            item.versionNo = i.versionNo;
            item.deployed = i.deployed;
            item.createdAt = new Date(i.createdAt);
            item.updatedAt = new Date(i.updatedAt);
            res.groups.push(item);
        }

        if (results.LastEvaluatedKey) {
            res.pagination = {
                token: btoa(JSON.stringify(results.LastEvaluatedKey)),
                limit:results.Count
            };
        }

        logger.debug(`groups.dao assemble: exit: ${JSON.stringify(res)}`);
        return res;
    }

}
