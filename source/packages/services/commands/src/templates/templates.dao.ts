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
import AWS from 'aws-sdk';
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { TemplateListModel, TemplateModel, TemplateSummaryModel } from './templates.models';

@injectable()
export class TemplatesDao {
    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('tables.templates') private templatesTable: string,
        @inject(TYPES.DocumentClientFactory)
        documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async create(model: TemplateModel): Promise<void> {
        logger.debug(`templates.dao create: in: model:${JSON.stringify(model)}`);

        const params = {
            TableName: this.templatesTable,
            Item: {
                templateId: model.templateId,
                operation: model.operation,
                description: model.description,
                document: model.document,
                requiredDocumentParameters: model.requiredDocumentParameters,
                requiredFiles: model.requiredFiles,
                allowFileUploads: model.allowFileUploads,
                presignedUrlExpiresInSeconds: model.presignedUrlExpiresInSeconds,
            },
            ConditionExpression: 'attribute_not_exists(templateId)',
        };

        if (model.rolloutMaximumPerMinute) {
            params.Item['rolloutMaximumPerMinute'] = model.rolloutMaximumPerMinute;
        }
        if (model.jobExecutionsRolloutConfig) {
            params.Item['jobExecutionsRolloutConfig'] = model.jobExecutionsRolloutConfig;
        }
        if (model.abortConfig) {
            params.Item['abortConfig'] = model.abortConfig;
        }
        if (model.timeoutConfig) {
            params.Item['timeoutConfig'] = model.timeoutConfig;
        }

        await this._dc.put(params).promise();

        logger.debug(`templates.dao create: exit:`);
    }

    public async update(model: TemplateModel): Promise<void> {
        logger.debug(`templates.dao update: in: model:${JSON.stringify(model)}`);

        const params = {
            TableName: this.templatesTable,
            Key: { templateId: model.templateId },
            UpdateExpression: '',
            ExpressionAttributeValues: {},
        };

        Object.keys(model).forEach((k) => {
            if (model.hasOwnProperty(k) && k !== 'templateId') {
                if (params.UpdateExpression === '') {
                    params.UpdateExpression += 'set ';
                } else {
                    params.UpdateExpression += ', ';
                }
                params.UpdateExpression += `${k} = :${k}`;

                params.ExpressionAttributeValues[`:${k}`] = model[k];
            }
        });

        // TODO add optimistic locking

        await this._dc.update(params).promise();

        logger.debug(`templates.dao create: exit:`);
    }

    public async get(templateId: string): Promise<TemplateModel> {
        logger.debug(`templates.dao get: in: templateId:${templateId}`);

        const params = {
            TableName: this.templatesTable,
            Key: {
                templateId,
            },
        };

        const response = await this._dc.get(params).promise();
        if (response.Item === undefined) {
            logger.debug('templates.dao get: exit: template:undefined');
            return undefined;
        }
        const template: TemplateModel = {
            templateId: response.Item['templateId'],
            operation: response.Item['operation'],
            description: response.Item['description'],
            document: response.Item['document'],
            requiredDocumentParameters: response.Item['requiredDocumentParameters'],
            requiredFiles: response.Item['requiredFiles'],
            allowFileUploads: response.Item['allowFileUploads'],
            presignedUrlExpiresInSeconds: response.Item['presignedUrlExpiresInSeconds'],
        };
        if (response.Item['jobExecutionsRolloutConfig']) {
            template.jobExecutionsRolloutConfig = JSON.parse(
                response.Item['jobExecutionsRolloutConfig']
            );
        }
        if (response.Item['abortConfig']) {
            template.abortConfig = JSON.parse(response.Item['abortConfig']);
        }
        if (response.Item['timeoutConfig']) {
            template.timeoutConfig = JSON.parse(response.Item['timeoutConfig']);
        }

        logger.debug(`templates.dao get: exit: template:${JSON.stringify(template)}`);
        return template;
    }

    public async list(): Promise<TemplateListModel> {
        logger.debug('templates.dao get: list:');

        const params = {
            TableName: this.templatesTable,
            AttributesToGet: ['templateId', 'description'],
        };

        const results = await this._dc.scan(params).promise();
        if (results.Items === undefined) {
            logger.debug('templates.dao list: exit: templates:undefined');
            return undefined;
        }

        const templates: TemplateSummaryModel[] = [];
        const response: TemplateListModel = {
            templates,
        };

        for (const item of results.Items) {
            const template: TemplateSummaryModel = {
                templateId: item['templateId'],
                operation: item['operation'],
                description: item['description'],
            };
            response.templates.push(template);
        }

        logger.debug(`templates.dao list: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    public async delete(templateId: string): Promise<void> {
        logger.debug(`templates.dao delete: in: templateId:${templateId}`);

        const params = {
            TableName: this.templatesTable,
            Key: { templateId },
        };

        await this._dc.delete(params).promise();

        logger.debug(`templates.dao delete: exit:`);
    }
}
