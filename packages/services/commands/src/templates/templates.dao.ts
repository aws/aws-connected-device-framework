/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import { TemplateModel, TemplateListModel, TemplateSummaryModel } from './templates.models';
import AWS = require('aws-sdk');

@injectable()
export class TemplatesDao {

    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('tables.templates') private templatesTable:string,
	    @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async create(model:TemplateModel): Promise<void> {
        logger.debug(`templates.dao create: in: model:${JSON.stringify(model)}`);

        const params = {
            TableName: this.templatesTable,
            Item: {
                templateId: model.templateId,
                operation: model.operation,
                description:model.description,
                document:model.document,
                requiredDocumentParameters:model.requiredDocumentParameters,
                requiredFiles:model.requiredFiles,
                allowFileUploads:model.allowFileUploads,
                presignedUrlExpiresInSeconds:model.presignedUrlExpiresInSeconds
            },
            ConditionExpression: 'attribute_not_exists(templateId)'
        };

        await this._dc.put(params).promise();

        logger.debug(`templates.dao create: exit:`);

    }

    public async update(model:TemplateModel): Promise<void> {
        logger.debug(`templates.dao update: in: model:${JSON.stringify(model)}`);

        const params = {
            TableName: this.templatesTable,
            Key: { templateId: model.templateId},
            UpdateExpression: '',
            ExpressionAttributeValues: {}
        };

        Object.keys(model).forEach(k=> {
            if (model.hasOwnProperty(k) && k !== 'templateId' ) {
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

        logger.debug(`templates.dao create: exit:`);

    }

    public async get(templateId:string): Promise<TemplateModel> {
        logger.debug(`templates.dao get: in: templateId:${templateId}`);

        const params = {
            TableName : this.templatesTable,
            Key: {
                templateId
            }
        };

        const response = await this._dc.get(params).promise();
        if (response.Item===undefined) {
            logger.debug('templates.dao get: exit: template:undefined');
            return undefined;
        }
        const template = {
            templateId: response.Item['templateId'],
            operation: response.Item['operation'],
            description: response.Item['description'],
            document: response.Item['document'],
            requiredDocumentParameters: response.Item['requiredDocumentParameters'],
            requiredFiles: response.Item['requiredFiles'],
            allowFileUploads: response.Item['allowFileUploads'],
            presignedUrlExpiresInSeconds: response.Item['presignedUrlExpiresInSeconds']
        };

        logger.debug(`templates.dao get: exit: template:${JSON.stringify(template)}`);
        return template;
    }

    public async list(): Promise<TemplateListModel> {
        logger.debug('templates.dao get: list:');

        const params = {
            TableName : this.templatesTable,
            AttributesToGet: [ 'templateId', 'description']
        };

        const results = await this._dc.scan(params).promise();
        if (results.Items===undefined) {
            logger.debug('templates.dao list: exit: templates:undefined');
            return undefined;
        }

        const templates:TemplateSummaryModel[]=[];
        const response:TemplateListModel = {
            templates
        };

        for(const item of results.Items) {
            const template = {
                templateId: item['templateId'],
                operation: item['operation'],
                description: item['description']
            };
            response.templates.push(template);
        }

        logger.debug(`templates.dao list: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    public async delete(templateId:string): Promise<void> {
        logger.debug(`templates.dao delete: in: templateId:${templateId}`);

        const params = {
            TableName: this.templatesTable,
            Key: { templateId}
        };

        await this._dc.delete(params).promise();

        logger.debug(`templates.dao delete: exit:`);

    }

}
