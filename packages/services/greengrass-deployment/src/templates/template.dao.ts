/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import AWS = require('aws-sdk');
import {inject, injectable} from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { createDelimitedAttribute, expandDelimitedAttribute, PkType } from '../utils/pKUtils.util';
import { DynamoDbUtils } from '../utils/dynamoDb.util';

import { DeploymentTemplateModel, DeploymentTemplatesList } from './template.model';

@injectable()
export class DeploymentTemplatesDao {

    private readonly SI1_INDEX = 'sk-si1Sort-index';

    private dc: AWS.DynamoDB.DocumentClient;

    constructor(
        @inject('aws.dynamoDB.ggProvisioningTable') private provisioningTable: string,
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils:DynamoDbUtils,
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async save(template: DeploymentTemplateModel): Promise<void> {
        logger.debug(`DeploymentTemplatesDao create: in: template: ${JSON.stringify(template)}`);

        const templateDbId = createDelimitedAttribute(PkType.DeploymentTemplate, template.name);

        // create/update the current version record
        const currentRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: templateDbId,
                    sk:  PkType.DeploymentTemplate,
                    si1Sort: createDelimitedAttribute(PkType.DeploymentTemplate, template.enabled, template.name),
                    createdAt: template.createdAt?.toISOString(),
                    updatedAt: template.updatedAt?.toISOString(),
                    versionNo: template.versionNo,
                    enabled: template.enabled,
                    source: template.source,
                    type: template.type,
                    envVars: template.envVars,
                    options: template.options,
                    description: template.description
                }
            }
        };

        // create the version record
        const versionRecord : AWS.DynamoDB.DocumentClient.WriteRequest = {
            PutRequest: {
                Item: {
                    pk: templateDbId,
                    sk:  createDelimitedAttribute(PkType.DeploymentTemplateVersion, template.versionNo),
                    createdAt: template.createdAt?.toISOString(),
                    updatedAt: template.updatedAt?.toISOString(),
                    versionNo: template.versionNo
                }
            }
        };

        // build the request and write to DynamoDB
        const params: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {}
        };
        params.RequestItems[this.provisioningTable]=[versionRecord, currentRecord];

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_FAILED');
        }

        logger.debug(`DeploymentTemplateDao: create: exit:`);
    }

    public async get(templateName: string): Promise<DeploymentTemplateModel> {
        logger.debug(`DeploymentTemplatesDao get: in: templateName: ${templateName}`);

        const params = {
            TableName: this.provisioningTable,
            KeyConditionExpression: `#hash = :hash AND #range = :range`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#range': 'sk'
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.DeploymentTemplate, templateName),
                ':range': PkType.DeploymentTemplate
            }
        };

        let results;
        try {
            results = await this.dc.query(params).promise();
        } catch (err) {
            throw new Error(err);
        }

        if (results.Items===undefined || results.Items.length===0) {
            logger.debug('templates.dao get: exit: undefined');
            return undefined;
        }

        const templates = this.assembleTemplateList(results.Items);

        logger.debug(`DeploymentTemplatesDao get: exit: deploymentTemplate: ${JSON.stringify(templates)}`);
        return templates.templates[0];
    }

    public async list() : Promise<DeploymentTemplatesList> {
        logger.debug(`templates.dao list: in:`);

        const params:AWS.DynamoDB.DocumentClient.QueryInput = {
            TableName: this.provisioningTable,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#hash = :hash`,
            ExpressionAttributeNames: {
                '#hash': 'sk'
            },
            ExpressionAttributeValues: {
                ':hash': PkType.DeploymentTemplate
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

    private assembleTemplateList(results:AWS.DynamoDB.DocumentClient.ItemList) : DeploymentTemplatesList {
        logger.debug(`templates.dao assembleTemplate: items: ${JSON.stringify(results)}`);

        const templates = new DeploymentTemplatesList();
        for(const i of results) {

            const name = expandDelimitedAttribute(i.pk)[1];

            const template:DeploymentTemplateModel = {
                name,
                source: i.source,
                type: i.type,
                envVars: i.envVars,
                options: i.options,
                versionNo: i.versionNo,
                createdAt: new Date(i.createdAt),
                updatedAt: new Date(i.updatedAt),
                enabled: i.enabled,
                description: i.description
            } ;

            templates.templates.push(template);
        }

        logger.debug(`templates.dao assembleTemplate: exit: ${JSON.stringify(templates)}`);
        return templates;
    }

}
