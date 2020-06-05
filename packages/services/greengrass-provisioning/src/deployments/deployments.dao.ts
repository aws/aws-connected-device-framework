/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {inject, injectable} from 'inversify';
import {logger} from '../utils/logger.util';
import {TYPES} from '../di/types';
import {DeploymentItem, DeploymentTaskSummary, DeviceDeploymentItem} from './deployments.models';
import {DynamoDbUtils} from '../utils/dynamoDb.util';
import {createDelimitedAttribute, createDelimitedAttributePrefix, PkType} from '../utils/pkUtils.util';

@injectable()
export class DeploymentsDao {

    private readonly SI1_INDEX = 'sk-si1Sort-index';

    private dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.table') private tableName:string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async saveBulkDeploymentDetails(taskId:string, deploymentDetails:DeploymentItem[]) : Promise<void> {
        logger.debug(`deployments.dao saveBulkDeploymentDetails: in: taskId:${taskId}, deploymentDetails:${JSON.stringify(deploymentDetails)}`);

        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.tableName]= [];

        for(const d of deploymentDetails) {
            const groupDeploymentRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.DeploymentGroup, taskId),
                        sk:  createDelimitedAttribute(PkType.DeploymentId, PkType.GreengrassGroupId, d.groupId, 'map'),
                        si1Sort: createDelimitedAttribute(PkType.DeploymentId, d.deploymentId),
                        groupId: d.groupId,
                        groupName: d.groupName,
                        bulkDeploymentId: d.bulkDeploymentId,
                        deploymentStatus: d.deploymentStatus,
                        deploymentId: d.deploymentId,
                        deploymentType: d.deploymentType,
                        createdAt: d.createdAt?.toISOString(),
                        updatedAt: d.updatedAt?.toISOString()
                    }
                }
            };
            this.dynamoDbUtils.putAttributeIfDefined(groupDeploymentRecord, 'statusMessage', d.statusMessage);
            params.RequestItems[this.tableName].push(groupDeploymentRecord);
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`deployments.dao saveBulkDeploymentDetails: exit:`);
    }

    public async saveDeploymentTask(task:DeploymentTaskSummary) : Promise<void> {
        logger.debug(`deployments.dao saveDeploymentTask: in: task:${JSON.stringify(task)}`);

        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.tableName]= [];

        const summaryRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: createDelimitedAttribute(PkType.DeploymentGroup, task.taskId),
                    sk:  createDelimitedAttribute(PkType.DeploymentGroup, task.taskId),
                    taskStatus: task.taskStatus,
                    createdAt: task.createdAt?.toISOString(),
                    updatedAt: task.updatedAt?.toISOString()
                }
            }
        };
        const si2Hash:string = (task.bulkDeploymentId) ? createDelimitedAttribute(PkType.BulkDeploymentGroup, task.bulkDeploymentId) : undefined;
        this.dynamoDbUtils.putAttributeIfDefined(summaryRecord, 'si2Hash', si2Hash);
        this.dynamoDbUtils.putAttributeIfDefined(summaryRecord, 'bulkDeploymentId', task.bulkDeploymentId);
        this.dynamoDbUtils.putAttributeIfDefined(summaryRecord, 'bulkDeploymentStatus', task.bulkDeploymentStatus);
        params.RequestItems[this.tableName].push(summaryRecord);

        for(const deployment of task.deployments) {
            const groupRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.DeploymentGroup, task.taskId),
                        sk:  createDelimitedAttribute(PkType.GreengrassGroup, deployment.groupName),
                        si1Sort: createDelimitedAttribute(PkType.DeploymentGroup, task.taskStatus, task.updatedAt?.toISOString() ?? task.createdAt?.toISOString()),
                        deploymentType: deployment.deploymentType,
                        deploymentStatus: deployment.deploymentStatus,
                        createdAt: task.createdAt?.toISOString(),
                        updatedAt: task.updatedAt?.toISOString()
                    }
                }
            };
            this.dynamoDbUtils.putAttributeIfDefined(groupRecord, 'groupId', deployment.groupId);
            this.dynamoDbUtils.putAttributeIfDefined(groupRecord, 'groupVersionId', deployment.groupVersionId);
            this.dynamoDbUtils.putAttributeIfDefined(groupRecord, 'deploymentId', deployment.deploymentId);
            this.dynamoDbUtils.putAttributeIfDefined(groupRecord, 'bulkDeploymentId', deployment.bulkDeploymentId);
            params.RequestItems[this.tableName].push(groupRecord);

            // TODO: do we still need this?
            // if (deployment.devices) {
            //     for(const device of deployment.devices) {
            //         const deviceRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            //             PutRequest: {
            //                 Item: {
            //                     pk: createDelimitedAttribute(PkType.DeploymentGroup, task.taskId),
            //                     sk:  createDelimitedAttribute(PkType.GreengrassGroup, deployment.groupName, PkType.GreengrassDevice, device.thingName),
            //                     deploymentStatus: device.deploymentStatus,
            //                     statusMessage: device.statusMessage,
            //                     createdAt: device.createdAt?.toISOString(),
            //                     updatedAt: device.updatedAt?.toISOString()
            //                 }
            //             }
            //         };
            //         params.RequestItems[this.tableName].push(deviceRecord);
            //     }
            // }
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`deployments.dao saveDeploymentTask: exit:`);
    }

    public async getDeploymentTask(taskId:string, summary:boolean=false, groupName?:string) : Promise<DeploymentTaskSummary> {
        logger.debug(`deployments.dao getDeploymentTask: in: taskId:${taskId}, summary:${summary}, groupName:${groupName}`);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            KeyConditionExpression: `#pk=:pk`,
            ExpressionAttributeNames: {
                '#pk': 'pk'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.DeploymentGroup, taskId)
            }
        };

        if (groupName!==undefined) {
            // filter on a specific group if a group name has been provided
            params.KeyConditionExpression+=' AND begins_with(#sk,:sk)';
            params.ExpressionAttributeNames['#sk'] = 'sk';
            params.ExpressionAttributeValues[':sk'] = createDelimitedAttribute(PkType.GreengrassGroup, groupName);
        } else if (summary) {
            // only return the summary record if the summary is all we need
            params.KeyConditionExpression+=' AND begins_with(#sk,:sk)';
            params.ExpressionAttributeNames['#sk'] = 'sk';
            params.ExpressionAttributeValues[':sk'] = createDelimitedAttributePrefix(PkType.DeploymentGroup);
        }

        const results = await this.dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('deployments.dao getDeploymentTask: exit: undefined');
            return undefined;
        }

        const task = this.assemble(results.Items);
        logger.debug(`deployments.dao getDeploymentTask: exit: ${JSON.stringify(task)}`);
        return task;
    }

    public async getDeploymentIdMap(deploymentId:string, groupId:string) : Promise<DeploymentTaskSummary> {
        logger.debug(`deployments.dao getDeploymentIdMap: in: deploymentId:${deploymentId}, groupId:${groupId}`);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#pk=:pk AND #sk=:sk`,
            ExpressionAttributeNames: {
                '#pk': 'sk',
                '#sk': 'si1Sort'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.DeploymentId, PkType.GreengrassGroupId, groupId, 'map'),
                ':sk': createDelimitedAttribute(PkType.DeploymentId, deploymentId)
            }
        };

        const results = await this.dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('deployments.dao getDeploymentIdMap: exit: undefined');
            return undefined;
        }

        const task = this.assemble(results.Items);
        logger.debug(`deployments.dao getDeploymentIdMap: exit: ${JSON.stringify(task)}`);
        return task;
    }

    private assemble(results:AWS.DynamoDB.DocumentClient.ItemList) : DeploymentTaskSummary {
        logger.debug(`deployments.dao assemble: in: items: ${JSON.stringify(results)}`);

        const task = new DeploymentTaskSummary();
        task.deployments= [];
        for(const i of results) {

            const pkElements = i.pk.split(':');
            const skElements = i.sk.split(':');

            if (skElements.length===2 && skElements[0]===PkType.DeploymentGroup) {
                // task item
                task.taskId = pkElements[1];
                task.taskStatus = i.taskStatus;
                task.bulkDeploymentId = i.bulkDeploymentId;
                task.bulkDeploymentStatus = i.bulkDeploymentStatus;
                task.createdAt = new Date(i.createdAt);
                task.updatedAt = new Date(i.updatedAt);
            } else if (skElements.length===2 && skElements[0]===PkType.GreengrassGroup) {
                // group  item
                const groupName = skElements[1];
                const d = this.getOrCreateAssembledDeployment(task, groupName, i.createdAt, i.updatedAt);
                d.groupId = i.groupId;
                d.groupVersionId = i.groupVersion;
                d.bulkDeploymentId = i.bulkDeploymentId;
                d.deploymentId = d.deploymentId ?? i.deploymentId;
                d.deploymentType = d.deploymentType ?? i.deploymentType;
                d.deploymentStatus = i.deploymentStatus ?? d.deploymentStatus;
            } else if (skElements.length===4 && skElements[0]===PkType.GreengrassGroup && skElements[2]===PkType.DeploymentGroup) {
                // group deployment item
                const groupName = skElements[1];
                const d = this.getOrCreateAssembledDeployment(task, groupName, i.createdAt, i.updatedAt);
                d.deploymentId = i.deploymentId;
                d.deploymentType = i.deploymentType ?? d.deploymentType;
                d.deploymentStatus = i.deploymentStatus ?? d.deploymentStatus;
                d.statusMessage = i.statusMessage;
            } else if (skElements.length===4 && skElements[2]===PkType.GreengrassDevice) {
                // device deployment item
                const groupName = skElements[1];
                const thingName = skElements[3];
                const d = this.getOrCreateAssembledDeployment(task, groupName, i.createdAt, i.updatedAt);
                if (d.devices===undefined) {
                    d.devices= [];
                }
                const device = new DeviceDeploymentItem();
                device.thingName = thingName;
                device.deploymentStatus = i.deploymentStatus;
                device.statusMessage = i.statusMessage;
                d.devices.push(device);
            } else if (skElements.length===4 && skElements[0]===PkType.DeploymentId && skElements[1]===PkType.GreengrassGroupId && skElements[2]==='map') {
                // deployment map
                const d = this.getOrCreateAssembledDeployment(task, i.groupName, i.createdAt, i.updatedAt);
                d.deploymentId = i.deploymentId ?? d.deploymentId;
                d.bulkDeploymentId = i.bulkDeploymentId ?? d.bulkDeploymentId;
                d.groupId = i.groupId ?? d.groupId;
                d.deploymentType = i.deploymentType ?? d.deploymentType;
                d.deploymentStatus = i.deploymentStatus ?? d.deploymentStatus;
                d.statusMessage = i.statusMessage;
            } else {
                logger.warn(`deployments.dao assemble: skipping sk ${i.sk} as not recognized`);
                continue;
            }
        }

        logger.debug(`deployments.dao assemble: exit: ${JSON.stringify(task)}`);
        return task;
    }

    private getOrCreateAssembledDeployment(task:DeploymentTaskSummary, groupName:string, rawCreatedAt:string, rawUpdatedAt:string) : DeploymentItem {
        logger.debug(`deployments.dao getOrCreateAssembledDeployment: in: task:${JSON.stringify(task)}, groupName:${groupName}, rawCreatedAt:${rawCreatedAt}, rawUpdatedAt:${rawUpdatedAt}`);
        let deployment:DeploymentItem;
        const matchingDeployments = task.deployments.filter(d=> d.groupName===groupName);
        if (matchingDeployments.length>0) {
            deployment = matchingDeployments[0];
        } else {
            deployment = new DeploymentItem();
            deployment.groupName = groupName;
            task.deployments.push(deployment);
        }

        const createdAt = new Date(rawCreatedAt);
        if (deployment.createdAt===undefined || createdAt < deployment.createdAt) {
            deployment.createdAt = createdAt;
        }
        if (rawUpdatedAt!==undefined) {
            const updatedAt = new Date(rawUpdatedAt);
            if (deployment.updatedAt===undefined || updatedAt > deployment.updatedAt) {
                deployment.updatedAt = updatedAt;
            }
        }
        return deployment;
    }
}
