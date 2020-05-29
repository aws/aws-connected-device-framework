/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {TYPES} from '../di/types';
import { DeviceTaskSummary, DeviceTaskItem, DeviceItem } from './devices.models';
import { DynamoDbUtils } from '../utils/dynamoDb.util';
import { createDelimitedAttribute, PkType, createDelimitedAttributePrefix } from '../utils/pkUtils.util';

@injectable()
export class DevicesDao {

    private readonly SI2_INDEX = 'si2Hash-sk-index';

    private dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.table') private tableName:string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async saveDeviceAssociationTask(task:DeviceTaskSummary) : Promise<void> {
        logger.debug(`devices.dao saveDeviceAssociationTask: in: task:${JSON.stringify(task)}`);

        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.tableName]= [];

        const taskRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: createDelimitedAttribute(PkType.GreengrassGroup, task.groupName),
                    sk:  createDelimitedAttribute(PkType.GreengrassDeviceTask, task.taskId),
                    si1Sort: createDelimitedAttribute(PkType.GreengrassDeviceTask, task.status, task.taskId),
                    status: task.status,
                    createdAt: task.createdAt?.toISOString(),
                    updatedAt: task.updatedAt?.toISOString()
                }
            }
        };
        params.RequestItems[this.tableName].push(taskRecord);

        for(const device of task.devices) {
            const taskDeviceRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.GreengrassGroup, task.groupName),
                        sk:  createDelimitedAttribute(PkType.GreengrassDeviceTask, task.taskId, PkType.GreengrassDevice, device.thingName),
                        si2Hash: createDelimitedAttribute(PkType.GreengrassDevice, device.thingName),
                        status: device.status,
                        statusMessage: device.statusMessage,
                        createdAt: device.createdAt?.toISOString(),
                        updatedAt: device.updatedAt?.toISOString()
                    }
                }
            };
            params.RequestItems[this.tableName].push(taskDeviceRecord);

            const deviceRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
                PutRequest: {
                    Item: {
                        pk: createDelimitedAttribute(PkType.GreengrassGroup, task.groupName),
                        sk:  createDelimitedAttribute(PkType.GreengrassDevice, device.thingName),
                        si2Hash: createDelimitedAttribute(PkType.GreengrassDevice, device.thingName),
                        deployed: device.deployed,
                        createdAt: device.createdAt?.toISOString(),
                        updatedAt: device.updatedAt?.toISOString()
                    }
                }
            };
            params.RequestItems[this.tableName].push(deviceRecord);

            if (device.artifacts) {
                Object.keys(device.artifacts).forEach(key=> {
                    const artifactRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
                        PutRequest: {
                            Item: {
                                pk: createDelimitedAttribute(PkType.GreengrassGroup, task.groupName),
                                sk:  createDelimitedAttribute(PkType.GreengrassDeviceTask, task.taskId, PkType.GreengrassDevice, device.thingName, PkType.Artifact, key),
                                si2Hash: createDelimitedAttribute(PkType.GreengrassDevice, device.thingName),
                                bucket: device.artifacts[key].bucket,
                                key: device.artifacts[key].key,
                                createdAt: device.createdAt?.toISOString(),
                                updatedAt: device.updatedAt?.toISOString()
                            }
                        }
                    };
                    params.RequestItems[this.tableName].push(artifactRecord);
                });
            }
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`devices.dao saveDeviceAssociationTask: exit:`);
    }

    public async getDeviceAssociationTask(groupName:string, taskId:string) : Promise<DeviceTaskSummary> {
        logger.debug(`devices.dao getDeviceAssociationTask: in: groupName:${groupName}, taskId:${taskId}`);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
                '#sk': 'sk'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.GreengrassGroup, groupName),
                ':sk': createDelimitedAttribute(PkType.GreengrassDeviceTask, taskId)
            }
        };

        const results = await this.dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('devices.dao getDeviceAssociationTask: exit: undefined');
            return undefined;
        }

        const task = this.assembleTaskSummary(results.Items);
        logger.debug(`devices.dao getDeviceAssociationTask: exit: ${JSON.stringify(task)}`);
        return task;
    }

    public async getDevice(deviceId:string) : Promise<DeviceItem> {
        logger.debug(`devices.dao getDevice: in: deviceId:${deviceId}`);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            IndexName: this.SI2_INDEX,
            KeyConditionExpression: `#pk=:pk`,
            ExpressionAttributeNames: {
                '#pk': 'si2Hash'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.GreengrassDevice, deviceId)
            }
        };

        const results = await this.dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('devices.dao getDevice: exit: undefined');
            return undefined;
        }

        const task = this.assembleDevice(results.Items);
        logger.debug(`devices.dao getDevice: exit: ${JSON.stringify(task)}`);
        return task;
    }

    public async listDevices(groupName:string, deployed?:boolean) : Promise<DeviceItem[]> {
        logger.debug(`devices.dao listDevices: in: groupName:${groupName}, deployed:${deployed}`);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.tableName,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
                '#sk': 'sk'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.GreengrassGroup, groupName),
                ':sk': createDelimitedAttributePrefix(PkType.GreengrassDevice)
            }
        };

        if (deployed!==undefined) {
            params.FilterExpression = '#deployed = :deployed';
            params.ExpressionAttributeNames['#deployed'] = 'deployed';
            params.ExpressionAttributeValues[':deployed'] = deployed;
        }

        const results = await this.dc.query(params).promise();
        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('devices.dao listDevices: exit: undefined');
            return undefined;
        }

        const devices = this.assembleDevices(results.Items);
        logger.debug(`devices.dao listDevices: exit: ${JSON.stringify(devices)}`);
        return devices;
    }

    private assembleDevices(results:AWS.DynamoDB.DocumentClient.ItemList) : DeviceItem[] {
        logger.debug(`devices.dao assembleDevices: in: items: ${JSON.stringify(results)}`);

        const devices:DeviceItem[] = [];
        for(const i of results) {

            const skElements = i.sk.split(':');

            if (skElements.length===2 && skElements[0]===PkType.GreengrassDevice) {
                // device item
                const device = new DeviceItem();
                device.thingName = skElements[1];
                device.createdAt = new Date(i.createdAt);
                device.updatedAt = new Date(i.updatedAt);
                device.deployed = i.deployed;
                devices.push(device);
            } else {
                logger.warn(`devices.dao assembleDevices: skipping sk ${i.sk} as not recognized`);
                continue;
            }
        }

        logger.debug(`devices.dao assembleDevices: exit: ${JSON.stringify(devices)}`);
        return devices;
    }

    private assembleDevice(results:AWS.DynamoDB.DocumentClient.ItemList) : DeviceItem {
        logger.debug(`devices.dao assembleDevice: in: items: ${JSON.stringify(results)}`);

        const device = new DeviceItem();
        for(const i of results) {

            const pkElements = i.pk.split(':');
            const skElements = i.sk.split(':');

            if (skElements.length===2 && skElements[0]===PkType.GreengrassDevice) {
                // device item
                device.thingName = skElements[1];
                device.createdAt = new Date(i.createdAt);
                device.updatedAt = new Date(i.updatedAt);
                device.deployed = i.deployed;
            } else if (skElements.length===4 && skElements[0]===PkType.GreengrassDeviceTask && skElements[2]===PkType.GreengrassDevice) {
                // device task item
                const task = {
                    taskId: skElements[1],
                    groupName: pkElements[1],
                    status: i.status,
                    statusMessage: i.statusMessage,
                    createdAt: new Date(i.createdAt),
                    updatedAt: new Date(i.updatedAt)
                };
                if (device.tasks===undefined) {
                    device.tasks= [];
                }
                device.tasks.push(task);
            } else if (skElements.length===6 && skElements[0]===PkType.GreengrassDeviceTask && skElements[2]===PkType.GreengrassDevice && skElements[4]===PkType.Artifact) {
                // device item
                if (device.artifacts===undefined) {
                    device.artifacts = {};
                }
                device.artifacts[skElements[5]] = {
                    bucket: i.bucket,
                    key: i.key,
                    createdAt: new Date(i.createdAt)
                };
            } else {
                logger.warn(`devices.dao assembleDevice: skipping sk ${i.sk} as not recognized`);
                continue;
            }
        }

        logger.debug(`devices.dao assembleDevice: exit: ${JSON.stringify(device)}`);
        return device;
    }

    private assembleTaskSummary(results:AWS.DynamoDB.DocumentClient.ItemList) : DeviceTaskSummary {
        logger.debug(`devices.dao assemble: in: items: ${JSON.stringify(results)}`);

        const task = new DeviceTaskSummary();
        for(const i of results) {

            const skElements = i.sk.split(':');

            if (skElements.length===2 && skElements[0]===PkType.GreengrassDeviceTask) {
                // summary item
                task.taskId = skElements[1];
                task.groupName = i.pk.split(':')[1];
                task.status = i.status;
                task.createdAt = new Date(i.createdAt);
                task.updatedAt = new Date(i.updatedAt);
            } else if (skElements.length===4 && skElements[2]===PkType.GreengrassDevice) {
                // device task item
                const thingName = skElements[3];
                const device = this.getOrCreateAssembledDeviceTask(task, thingName, i.createdAt, i.updatedAt);
                device.status = i.status;
                device.statusMessage = i.statusMessage;
            } else if (skElements.length===2 && skElements[0]===PkType.GreengrassDevice) {
                // device item
                const thingName = skElements[1];
                const device = this.getOrCreateAssembledDeviceTask(task, thingName, i.createdAt, i.updatedAt);
                device.deployed = i.deployed;
            } else if (skElements.length===6 && skElements[2]===PkType.GreengrassDevice && skElements[4]===PkType.Artifact) {
                // device artifact item
                const thingName = skElements[3];
                const device = this.getOrCreateAssembledDeviceTask(task, thingName, i.createdAt, i.updatedAt);
                const artifactType = skElements[5];
                if (device.artifacts===undefined) {
                    device.artifacts= {};
                }
                device.artifacts[artifactType] = {
                    bucket: i.bucket,
                    key: i.key,
                    createdAt: new Date(i.createdAt)
                };
            } else {
                logger.warn(`devices.dao assemble: skipping sk ${i.sk} as not recognized`);
                continue;
            }
        }

        logger.debug(`devices.dao assemble: exit: ${JSON.stringify(task)}`);
        return task;
    }

    private getOrCreateAssembledDeviceTask(task:DeviceTaskSummary, thingName:string, rawCreatedAt:string, rawUpdatedAt:string) : DeviceTaskItem {
        let device:DeviceTaskItem;
        const matchingDevices = task.devices.filter(d=> d.thingName===thingName);
        if (matchingDevices.length>0) {
            device = matchingDevices[0];
        } else {
            device = new DeviceTaskItem();
            device.thingName = thingName;
            task.devices.push(device);
        }

        const createdAt = new Date(rawCreatedAt);
        if (createdAt < device.createdAt) {
            device.createdAt = createdAt;
        }
        if (rawUpdatedAt!==undefined) {
            const updatedAt = new Date(rawUpdatedAt);
            if (updatedAt > device.updatedAt) {
                device.updatedAt = updatedAt;
            }
        }
        return device;
    }
}
