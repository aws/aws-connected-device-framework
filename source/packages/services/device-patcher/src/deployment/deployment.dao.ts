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

import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';
import { createDelimitedAttribute, expandDelimitedAttribute, PkType } from '../utils/pKUtils.util';
import { DynamoDbUtils } from '../utils/dynamoDb.util';

import {
    DeploymentItem,
} from './deployment.model';
import { DeploymentListPaginationKey, DynamoDbPaginationKey } from './deploymentTask.dao';
import atob from 'atob';
import btoa from 'btoa';

@injectable()
export class DeploymentDao {

    private dc: AWS.DynamoDB.DocumentClient;
    private readonly SI1_INDEX = 'sk-si1Sort-index';
    private readonly tableName = process.env.AWS_DYNAMODB_TABLE_NAME

    constructor(
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async save(deployment: DeploymentItem): Promise<void> {
        logger.debug(`deployment.dao: save: in: deployment: ${JSON.stringify(deployment)}`);

        const params = {
            TableName: this.tableName,
            Item: {
                pk: createDelimitedAttribute(PkType.DeviceDeploymentTask, deployment.deploymentId),
                sk: createDelimitedAttribute(PkType.Device, deployment.deviceId),
                si1Sort: createDelimitedAttribute(PkType.DeviceDeploymentTask, deployment.deploymentStatus, deployment.deploymentId),
                si2Hash: createDelimitedAttribute(PkType.DeploymentTemplate, deployment.deploymentTemplateName, PkType.DeploymentTemplateVersion, deployment.deploymentTemplate.versionNo),
                createdAt: deployment.createdAt?.toISOString(),
                updatedAt: deployment.updatedAt?.toISOString(),
                deploymentTemplateName: deployment.deploymentTemplateName,
                deploymentStatus: deployment.deploymentStatus,
                deploymentType: deployment.deploymentType,
                extraVars: deployment.extraVars
            }
        };

        await this.dc.put(params).promise();

        logger.debug(`deployment.dao: save: exit: `);
    }

    public async saveBatches(deployments: DeploymentItem[]): Promise<void> {
        logger.debug(`deployment.dao: saveBatches: in: deployment: ${JSON.stringify(deployments)}`);

        // build out the items to batch write
        const requestItems = []
        for (const deployment of deployments) {

            const deploymentRecord: AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.DeviceDeploymentTask, deployment.deploymentId),
                        sk: createDelimitedAttribute(PkType.Device, deployment.deviceId),
                        si1Sort: createDelimitedAttribute(PkType.DeviceDeploymentTask, deployment.deploymentStatus, deployment.deploymentId),
                        si2Hash: createDelimitedAttribute(PkType.DeploymentTemplate, deployment.deploymentTemplateName, PkType.DeploymentTemplateVersion, deployment.deploymentTemplate?.versionNo || null),
                        createdAt: deployment.createdAt?.toISOString(),
                        updatedAt: deployment.updatedAt?.toISOString(),
                        deploymentTemplateName: deployment.deploymentTemplateName,
                        deploymentStatus: deployment.deploymentStatus,
                        deploymentType: deployment.deploymentType,
                        taskId: deployment.taskId,
                        extraVars: deployment.extraVars
                    }
                }
            }

            if (deployment.statusMessage) {
                deploymentRecord.PutRequest.Item.statusMessage = deployment.statusMessage
            }

            requestItems.push(deploymentRecord)

            const deploymentTaskRecord: AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.DeploymentTask, deployment.taskId),
                        sk: createDelimitedAttribute(PkType.DeviceDeploymentTask, deployment.deploymentId),
                        si1Sort: createDelimitedAttribute(PkType.DeploymentTask, deployment.taskId),
                        si2Hash: createDelimitedAttribute(PkType.Device, deployment.deviceId)
                    }
                }
            }

            requestItems.push(deploymentTaskRecord)

        }

        // batch write the items to ddb
        // build the request and write to DynamoDB
        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.tableName] = requestItems;

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_FAILED');
        }

    }

    public async getBulk(deploymentItems: { deploymentId: string, deviceId: string }[]): Promise<DeploymentItem[]> {
        logger.debug(`deployment.dao: list: in: deploymentItems: ${deploymentItems}`);

        const params = {
            RequestItems: {}
        };

        params.RequestItems[this.tableName] = { Keys: [] };

        for (const item of deploymentItems) {
            params.RequestItems[this.tableName].Keys.push({
                pk: createDelimitedAttribute(PkType.DeviceDeploymentTask, item.deploymentId),
                sk: createDelimitedAttribute(PkType.Device, item.deviceId),
            });

            params.RequestItems[this.tableName].Keys.push({
                pk: createDelimitedAttribute(PkType.DeviceDeploymentTask, item.deploymentId),
                sk: createDelimitedAttribute(PkType.DeviceDeploymentTask, PkType.DeviceDeploymentAssociation, 'map'),
            });
        }

        const result = await this.dynamoDbUtils.batchGetAll(params);
        if (result.Responses[this.tableName] === undefined || result.Responses[this.tableName].length === 0) {
            logger.debug('deployments.dao list: exit: undefined');
            return undefined;
        }

        const deployments = this.assembleDeployment(result.Responses[this.tableName]);

        logger.debug(`deployment.dao: list: exit: deploymentList: ${JSON.stringify(deployments)}`);

        return deployments;
    }

    public async get(deploymentId: string): Promise<DeploymentItem> {
        logger.debug(`deployment.dao: list: in: deploymentId: ${deploymentId}`);

        const params = {
            TableName: this.tableName,
            KeyConditionExpression: `#pk=:pk`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.DeviceDeploymentTask, deploymentId),
            }
        };

        const result = await this.dc.query(params).promise();
        if (result.Items === undefined || result.Items.length === 0) {
            logger.debug('deployments.dao list: exit: undefined');
            return undefined;
        }

        const deployments = this.assembleDeployment(result.Items);

        logger.debug(`deployment.dao: list: exit: deploymentList: ${JSON.stringify(deployments)}`);

        return deployments[0];
    }

    public async list(deviceId: string, status?: string, count?: number, exclusiveStart?: DeploymentListPaginationKey): Promise<[DeploymentItem[], DeploymentListPaginationKey]> {
        logger.debug(`deployment.dao: list: in: deployment: ${JSON.stringify(deviceId)}`);

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (exclusiveStart?.nextToken) {
            const decoded = atob(`${exclusiveStart?.nextToken}`)
            exclusiveStartKey = JSON.parse(decoded)
        }

        const params = {
            TableName: this.tableName,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'sk',
                '#sk': 'si1Sort'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.Device, deviceId),
                ':sk': createDelimitedAttribute(PkType.DeviceDeploymentTask)
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count
        };

        if (status) {
            params.ExpressionAttributeValues[':sk'] = createDelimitedAttribute(PkType.Device, status);
        }

        const results = await this.dc.query(params).promise();
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug(`deploymentTask.dao:getDeployments exit: undefined`);
            return [undefined, undefined];
        }

        const deploymentItemKeys = results.Items.map(item => {
            return {
                deploymentId: expandDelimitedAttribute(item.pk)[1],
                deviceId: expandDelimitedAttribute(item.sk)[1]
            }
        })

        const deployments = await this.getBulk(deploymentItemKeys);

        let paginationKey: DeploymentListPaginationKey;
        if (results.LastEvaluatedKey) {
            const nextToken = btoa(`${JSON.stringify(results.LastEvaluatedKey)}`)
            paginationKey = {
                nextToken
            }
        }

        logger.debug(`deployment.dao: list: exit: deploymentList: ${JSON.stringify(deployments)}`);

        return [deployments, paginationKey];
    }

    public async update(deployment: DeploymentItem): Promise<void> {
        logger.debug(`deployment.dao: update: in: deployment: ${JSON.stringify(deployment)}`);

        let date = new Date().toISOString();

        if (deployment.updatedAt && deployment.updatedAt instanceof Date) {
            logger.silly(`deployment.dao: update: using updated at from payload, updatedAt: ${deployment.updatedAt}`);
            date = deployment.updatedAt.toISOString()
        }

        const params = {
            TableName: this.tableName,
            Key: {
                pk: createDelimitedAttribute(PkType.DeviceDeploymentTask, deployment.deploymentId),
                sk: createDelimitedAttribute(PkType.Device, deployment.deviceId),
            },
            UpdateExpression: 'set deploymentStatus = :s, statusMessage = :m, updatedAt = :u, deploymentTemplateName = :t, si1Sort = :si1Sort',
            ExpressionAttributeValues: {
                ':s': deployment.deploymentStatus,
                ':m': deployment.statusMessage || null,
                ':u': date,
                ':t': deployment.deploymentTemplateName,
                ':si1Sort': createDelimitedAttribute(PkType.DeviceDeploymentTask, deployment.deploymentStatus, deployment.deploymentId),
            }
        };

        const result = await this.dc.update(params).promise();

        logger.debug(`deployment.dao: save: exit: result: ${JSON.stringify(result)}`);

    }

    public async delete(deploymentId: string): Promise<void> {
        logger.debug(`deployment.dao: delete: in: deployment: ${JSON.stringify(deploymentId)}`);


        // retrieve all records associated with the template
        const queryParams: AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            KeyConditionExpression: `#hash = :hash`,
            ExpressionAttributeNames: { '#hash': 'pk' },
            ExpressionAttributeValues: { ':hash': createDelimitedAttribute(PkType.DeviceDeploymentTask, deploymentId) }
        };


        const queryResults = await this.dc.query(queryParams).promise();
        if (queryResults.Items === undefined || queryResults.Items.length === 0) {
            logger.debug('deployments.dao delete: exit: nothing to delete');
            return;
        }

        // batch delete
        const batchParams: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = { RequestItems: {} };
        batchParams.RequestItems[this.tableName] = [];
        queryResults.Items.forEach(i => {
            const req: AWS.DynamoDB.DocumentClient.WriteRequest = {
                DeleteRequest: {
                    Key: {
                        'pk': i.pk,
                        'sk': i.sk
                    }
                }
            }
            batchParams.RequestItems[this.tableName].push(req);

            const taskreq: AWS.DynamoDB.DocumentClient.WriteRequest = {
                DeleteRequest: {
                    Key: {
                        'pk': createDelimitedAttribute(PkType.DeploymentTask, i.taskId),
                        'sk': i.pk
                    }
                }
            }
            batchParams.RequestItems[this.tableName].push(taskreq);
        })

        const result = await this.dynamoDbUtils.batchWriteAll(batchParams);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('DELETE_FAILED');
        }

        logger.debug(`deployment.dao delete: exit:`);
    }

    private assembleDeployment(items: AWS.DynamoDB.DocumentClient.ItemList): DeploymentItem[] {

        const deployments: { [deploymentId: string]: DeploymentItem } = {};
        const associations: { [deploymentId: string]: { associationId: string } } = {};
        for (const i of items) {

            const pkElements = i.pk.split(':');
            const skElements = i.sk.split(':');
            const deploymentId = pkElements[1];

            if (skElements.length === 2 && skElements[0] === PkType.Device) {
                const deployment: DeploymentItem = {
                    deviceId: skElements[1],
                    deploymentId: pkElements[1],
                    taskId: i.taskId,
                    createdAt: new Date(i.createdAt),
                    updatedAt: new Date(i.updatedAt),
                    deploymentTemplateName: i.deploymentTemplateName,
                    deploymentStatus: i.deploymentStatus,
                    deploymentType: i.deploymentType
                };

                if (i.statusMessage) {
                    deployment.statusMessage = i.statusMessage
                }

                if (i.extraVars) {
                    deployment.extraVars = i.extraVars
                }
                deployments[deploymentId] = deployment
            } else if (skElements.length === 3 && skElements[0] === PkType.DeviceDeploymentTask) {
                associations[deploymentId] = { associationId: i.associationId };
            }

        }
        Object.keys(deployments).forEach(deployment => {
            if (associations[deployment]) {
                deployments[deployment].associationId = associations[deployment].associationId || null;
            } else {
                deployments[deployment].associationId = null;
            }

        });

        return Object.values(deployments);
    }

}
