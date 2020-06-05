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
import { createDelimitedAttribute, PkType } from '../utils/pkUtils.util';

@injectable()
export class GroupsDao {

    private dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.table') private tableName:string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
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
            // TODO: return unprocessed info
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`groups.dao saveGroup: exit:`);
    }

    public async saveGroups(items:GroupItemList) : Promise<void> {
        logger.debug(`groups.dao saveGroups: in: items: ${JSON.stringify(items)}`);

        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.tableName]= [];

        for(const item of items.groups) {
            params.RequestItems[this.tableName].push(...this.buildGroupItemRequest(item));
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            // TODO: return unprocessed info
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

        const groupList = this.assemble(results.Items);
        const group = groupList.groups[0];
        logger.debug(`groups.dao get: exit: ${JSON.stringify(group)}`);
        return group;
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

    private assemble(results:AWS.DynamoDB.DocumentClient.ItemList) : GroupItemList {
        logger.debug(`groups.dao assemble: items: ${JSON.stringify(results)}`);

        const res = new GroupItemList();
        for(const i of results) {

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

        logger.debug(`groups.dao assemble: exit: ${JSON.stringify(res)}`);
        return res;
    }

}
