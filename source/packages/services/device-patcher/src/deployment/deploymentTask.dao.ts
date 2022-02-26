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
import {inject, injectable} from 'inversify';
import btoa from 'btoa';
import atob from 'atob';

import {TYPES} from '../di/types';
import {logger} from '../utils/logger.util';
import {createDelimitedAttribute, expandDelimitedAttribute, PkType} from '../utils/pKUtils.util';

import {DeploymentTaskItem, DeploymentTaskList,} from './deploymentTask.model';
import {DeploymentItem} from './deployment.model';
import {DeploymentDao} from './deployment.dao';

@injectable()
export class DeploymentTaskDao {

    private dc: AWS.DynamoDB.DocumentClient;
    private readonly tableName = process.env.AWS_DYNAMODB_TABLE_NAME

    constructor(
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient,
        @inject(TYPES.DeploymentDao) private deploymentDao: DeploymentDao,
    ) {
        this.dc = documentClientFactory();
    }

    public async save(task: DeploymentTaskItem): Promise<void> {
        logger.debug(`deployment.dao: save: in: deploymentTask: ${JSON.stringify(task)}`);

        const params = {
            TableName: this.tableName,
            Item: {
                pk: createDelimitedAttribute(PkType.DeploymentTask, task.taskId),
                sk:  createDelimitedAttribute(PkType.DeploymentTask, task.taskId),
                si1Sort: createDelimitedAttribute(PkType.DeploymentTask),
                createdAt: task.createdAt?.toISOString(),
                updatedAt: task.updatedAt?.toISOString(),
            }
        };

        await this.dc.put(params).promise();

        logger.debug(`deployment.dao: save: exit: `);
    }

    public async get(taskId:string): Promise<DeploymentTaskItem> {
        logger.debug(`deploymentTask.dao:get:in:taskId:${taskId}`);

        const params = {
            TableName: this.tableName,
            Key: {
                pk: createDelimitedAttribute(PkType.DeploymentTask, taskId),
                sk: createDelimitedAttribute(PkType.DeploymentTask, taskId)
            }
        };


        const result = await this.dc.get(params).promise();
        if (result.Item===undefined) {
            logger.debug('agentbasedDeployments.dao exit: undefined');
            return undefined;
        }

        const deploymentTaskList = this.assemble([result.Item]);

        logger.debug(`deployment.dao: list: exit: deploymentList: ${JSON.stringify(deploymentTaskList)}`);

        return deploymentTaskList.deploymentTasks[0];
    }

    public async getDeployments(taskId: string, count?:number, exclusiveStart?: DeploymentListPaginationKey): Promise<[DeploymentItem[], DeploymentListPaginationKey]> {
        logger.debug(`deploymentTask.dao:getDeployments:in:taskId:${taskId}`);

        let exclusiveStartKey:DynamoDbPaginationKey;
        if (exclusiveStart?.nextToken) {
            const decoded = atob(`${exclusiveStart?.nextToken}`)
            exclusiveStartKey = JSON.parse(decoded)
        }

        const params = {
            TableName: this.tableName,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
                '#sk': 'sk'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.DeploymentTask, taskId),
                ':sk': createDelimitedAttribute(PkType.DeviceDeploymentTask)
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count
        };

        const results = await this.dc.query(params).promise();
        if ((results?.Items?.length??0)===0) {
            logger.debug(`deploymentTask.dao:getDeployments exit: undefined`);
            return [undefined,undefined];
        }

        const deploymentItemKeys = results.Items.map(item => {
            return {
                deploymentId: expandDelimitedAttribute(item.sk)[1],
                deviceId: expandDelimitedAttribute(item.si2Hash)[1]
            }
        })

        const deployments = await this.deploymentDao.getBulk(deploymentItemKeys);

        let paginationKey:DeploymentListPaginationKey;
        if (results.LastEvaluatedKey) {
            const nextToken = btoa(`${JSON.stringify(results.LastEvaluatedKey)}`)
            paginationKey = {
                nextToken
            }
        }

        logger.debug(`deploymentTask.dao:getDeployments: exit: response:${JSON.stringify(deployments)}, paginationKey:${paginationKey}`);
        return [deployments, paginationKey];

    }

    private assemble(items: AWS.DynamoDB.DocumentClient.ItemList): DeploymentTaskList {
        const list = new DeploymentTaskList();

        for(const i of items) {
            const pkElements = i.pk.split(':');
            const deployment: DeploymentTaskItem = {
                taskId: pkElements[1],
                createdAt: new Date(i.createdAt),
                updatedAt: new Date(i.updatedAt),
            };

            list.deploymentTasks.push(deployment);
        }
        return list;
    }

}

export declare type DeploymentListPaginationKey = {
    nextToken: string;
}


export type DynamoDbPaginationKey = {[key:string]:string};
