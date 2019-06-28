/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import { CommandModel, CommandListModel, CommandSummaryModel } from './commands.models';
import AWS = require('aws-sdk');

@injectable()
export class CommandsDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('tables.jobs') private jobsTable:string,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async get(commandId:string): Promise<CommandModel> {
        logger.debug(`commands.dao get: in: commandId:${commandId}`);

        const params = {
            TableName : this.jobsTable,
            Key: {
                commandId
            }
        };

        const response = await this._dc.get(params).promise();
        if (response.Item===undefined) {
            logger.debug('commands.dao get: exit: command:undefined');
            return undefined;
        }
        const i = response.Item;
        const command = this.buildCommandModel(i);

        logger.debug(`commands.dao get: exit: command:${JSON.stringify(command)}`);
        return command;
    }

    public async getByJobId(jobId:string): Promise<CommandModel> {
        logger.debug(`commands.dao getByJobId: in: jobId:${jobId}`);

        const params = {
            TableName : this.jobsTable,
            IndexName: 'cdf-commands-jobs-byJobId',
            KeyConditionExpression: 'jobId = :jobId',
            ExpressionAttributeValues: {':jobId': jobId}
        };

        const response = await this._dc.query(params).promise();
        if (response.Items===undefined || response.Items.length===0) {
            logger.debug('commands.dao getByJobId: exit: command:undefined');
            return undefined;
        }
        // should only be 1
        const i = response.Items[0];
        const command = this.buildCommandModel(i);

        logger.debug(`commands.dao getByJobId: exit: command:${JSON.stringify(command)}`);
        return command;
    }

    private buildCommandModel(i: AWS.DynamoDB.DocumentClient.AttributeMap) : CommandModel {
        const command = {
            commandId: i['commandId'],
            description: i['description'],
            templateId: i['templateId'],
            commandStatus: i['commandStatus'],
            jobStatus: i['jobStatus'],
            jobId: i['jobId'],
            targets: i['targets'],
            targetQuery: i['targetQuery'],
            documentParameters: i['documentParameters'],
            jobParameters: i['jobParameters'],
            files: i['files'],
            type: i['type'],
            rolloutMaximumPerMinute: i['rolloutMaximumPerMinute']
        };
        return command;
    }

    public async create(model:CommandModel): Promise<void> {
        logger.debug(`commands.dao create: in: model:${JSON.stringify(model)}`);

        const params = {
            TableName: this.jobsTable,
            Item: {
                commandId: model.commandId,
                templateId:model.templateId,
                commandStatus:model.commandStatus,
                jobStatus: model.jobStatus,
                jobId: model.jobId,
                targets:model.targets,
                targetQuery:model.targetQuery,
                documentParameters:model.documentParameters,
                jobParameters:model.jobParameters,
                files:model.files,
                type:model.type,
                rolloutMaximumPerMinute:model.rolloutMaximumPerMinute
            }
        };

        await this._dc.put(params).promise();

        logger.debug(`commands.dao create: exit:`);

    }

    public async update(model:CommandModel): Promise<void> {
        logger.debug(`commands.dao update: in: n:${JSON.stringify(model)}`);

        const params = {
            TableName: this.jobsTable,
            Key: { commandId: model.commandId},
            UpdateExpression: '',
            ExpressionAttributeValues: {}
        };

        Object.keys(model).forEach(k=> {
            if (model.hasOwnProperty(k) && k !== 'commandId' ) {
                if (params.UpdateExpression==='') {
                    params.UpdateExpression+='set ';
                } else {
                    params.UpdateExpression+=', ';
                }
                params.UpdateExpression += `${k} = :${k}`;

                params.ExpressionAttributeValues[`:${k}`] = model[k];
            }
        });

        // TODO add optimistic locking

        await this._dc.update(params).promise();

        logger.debug(`commands.dao create: exit:`);

    }

    public async list(): Promise<CommandListModel> {
        logger.debug('commands.dao get: list:');

        const params = {
            TableName: this.jobsTable,
            AttributesToGet: [ 'commandId', 'templateId', 'description', 'commandStatus']
        };

        const results = await this._dc.scan(params).promise();
        if (results.Items===undefined) {
            logger.debug('commands.dao list: exit: commands:undefined');
            return undefined;
        }

        const commands:CommandSummaryModel[]=[];
        const response:CommandListModel = {
            results:commands
        };

        for(const item of results.Items) {
            const command = {
                commandId: item['commandId'],
                templateId: item['templateId'],
                description: item['description'],
                commandStatus: item['commandStatus']
            };
            response.results.push(command);
        }

        logger.debug(`commands.dao list: exit: response:${JSON.stringify(response)}`);
        return response;
    }

}
