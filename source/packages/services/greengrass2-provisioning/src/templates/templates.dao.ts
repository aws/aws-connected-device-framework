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
import { inject, injectable } from 'inversify';
import clone from 'just-clone';
import ow from 'ow';

import {
    BatchWriteCommandInput,
    DynamoDBDocumentClient,
    PutCommand,
    PutCommandInput,
    QueryCommand,
    QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';

import {
    DynamoDbPaginationKey,
    GSI1_INDEX_NAME,
    GSI2_INDEX_NAME,
    GSI3_INDEX_NAME,
} from '../common/common.models';
import { TYPES } from '../di/types';
import { DocumentDbClientItem, DynamoDbUtils } from '../utils/dynamoDb.util';
import { logger } from '@awssolutions/simple-cdf-logger';
import {
    createDelimitedAttribute,
    createDelimitedAttributePrefix,
    expandDelimitedAttribute,
    PkType,
} from '../utils/pkUtils.util';
import { Component, TemplateItem } from './templates.models';

@injectable()
export class TemplatesDao {
    private dbc: DynamoDBDocumentClient;

    public constructor(
        @inject(TYPES.DynamoDbUtils) private dynamoDbUtils: DynamoDbUtils,
        @inject(TYPES.DynamoDBDocumentFactory) ddcFactory: () => DynamoDBDocumentClient,
    ) {
        this.dbc = ddcFactory();
    }

    public async get(name: string, version: number | string): Promise<TemplateItem> {
        logger.debug(`templates.dao get: in: name:${name}, version:${version}`);

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            KeyConditionExpression: `#hash=:hash AND begins_with(#range,:range)`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#range': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.Template, name),
                ':range': createDelimitedAttributePrefix(PkType.TemplateVersion, version),
            },
        };

        logger.silly(`templates.dao get: QueryInput: ${JSON.stringify(params)}`);

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('templates.dao get: exit: undefined');
            return undefined;
        }

        logger.silly(`query result: ${JSON.stringify(results)}`);

        const response = this.assemble(results.Items)?.[0];

        logger.debug(`templates.dao get: exit: response:${JSON.stringify(response)}`);
        return response;
    }

    public async listVersions(
        name: string,
        count?: number,
        lastEvaluated?: TemplateVersionListPaginationKey,
    ): Promise<[TemplateItem[], TemplateVersionListPaginationKey]> {
        logger.debug(
            `templates.dao listVersions: in: name:${name}, count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated,
            )}`,
        );

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (lastEvaluated?.version) {
            exclusiveStartKey = {
                pk: createDelimitedAttribute(PkType.Template, name),
                sk: createDelimitedAttribute(PkType.TemplateVersion, lastEvaluated.version),
                siKey2: createDelimitedAttribute(PkType.Template, name, PkType.Template),
                siSort2: createDelimitedAttribute(PkType.TemplateVersion, lastEvaluated.version),
            };
        }

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            IndexName: GSI2_INDEX_NAME,
            KeyConditionExpression: `#hash=:hash AND begins_with(#range,:range)`,
            ExpressionAttributeNames: {
                '#hash': 'siKey2',
                '#range': 'siSort2',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.Template, name, PkType.Template),
                ':range': createDelimitedAttributePrefix(PkType.TemplateVersion),
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        logger.silly(`templates.dao listVersions: QueryInput: ${JSON.stringify(params)}`);

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('templates.dao listVersions: exit: undefined');
            return [[], undefined];
        }
        logger.silly(`query result: ${JSON.stringify(results)}`);

        const getComponentsParams: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            KeyConditionExpression: `#hash=:hash AND begins_with(#range,:range)`,
            ExpressionAttributeNames: {
                '#hash': 'pk',
                '#range': 'sk',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.Template, name),
                ':range': createDelimitedAttributePrefix(PkType.TemplateVersion),
            },
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        logger.silly(
            `templates.dao listVersions: getComponentsParams: ${JSON.stringify(
                getComponentsParams,
            )}`,
        );

        let componentItems: unknown = [];
        // The components were not populated before
        const getComponentsResults = await this.dbc.send(new QueryCommand(getComponentsParams));
        if ((getComponentsResults?.Items?.length ?? 0) > 0) {
            componentItems = getComponentsResults.Items.filter((item) => {
                const sk = expandDelimitedAttribute(item.sk);
                return sk.length === 4 && sk[2] === PkType.Component;
            });
            logger.debug(
                `templates.dao listVersions: filtering components componentsItems: ${JSON.stringify(
                    componentItems,
                )}`,
            );
        }

        const response = this.assemble(results.Items.concat(componentItems));
        let paginationKey: TemplateVersionListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedVersion = Number(
                expandDelimitedAttribute(results.LastEvaluatedKey.sk)[1],
            );
            paginationKey = {
                version: lastEvaluatedVersion,
            };
        }

        logger.debug(
            `templates.dao listVersions: exit: response:${JSON.stringify(
                response,
            )}, paginationKey:${paginationKey}`,
        );
        return [response, paginationKey];
    }

    public async getTemplateIdByJobId(jobId: string): Promise<[string, number]> {
        logger.debug(`templates.dao getTemplateIdByJobId: in: jobId:${jobId}`);

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            IndexName: GSI3_INDEX_NAME,
            KeyConditionExpression: `#hash=:hash`,
            ExpressionAttributeNames: {
                '#hash': 'siKey3',
            },
            ExpressionAttributeValues: {
                ':hash': createDelimitedAttribute(PkType.IotJob, jobId),
            },
        };

        logger.silly(`templates.dao getTemplateIdByJobId: QueryInput: ${JSON.stringify(params)}`);

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('templates.dao getTemplateIdByJobId: exit: undefined');
            return undefined;
        }

        logger.silly(`query result: ${JSON.stringify(results)}`);

        const name: string = results.Items[0]?.name;
        const version: number = results.Items[0]?.version;

        logger.debug(`templates.dao getTemplateIdByJobId: exit: ${[name, version]}`);
        return [name, version];
    }

    public async save(template: TemplateItem): Promise<void> {
        logger.debug(`templates.dao save: in: template:${JSON.stringify(template)}`);

        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.version, ow.number.greaterThan(0));

        const params: BatchWriteCommandInput = {
            RequestItems: {
                [process.env.AWS_DYNAMODB_TABLE_NAME]: [],
            },
        };

        // current template item
        const templateDbId = createDelimitedAttribute(PkType.Template, template.name);
        const t = {
            PutRequest: {
                Item: {
                    pk: templateDbId,
                    sk: createDelimitedAttribute(PkType.TemplateVersion, 'current'),
                    siKey1: PkType.Template,
                    name: template.name,
                    version: template.version,
                    jobConfig: template.jobConfig,
                    deploymentPolicies: template.deploymentPolicies,
                    createdAt: template.createdAt?.toISOString(),
                    updatedAt: template.updatedAt?.toISOString(),
                },
            },
        };
        params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(t);

        // versioned template item
        const tv = clone(t);
        tv.PutRequest.Item.sk = createDelimitedAttribute(PkType.TemplateVersion, template.version);
        delete tv.PutRequest.Item.siKey1;
        tv.PutRequest.Item['siKey2'] = createDelimitedAttribute(
            PkType.Template,
            template.name,
            PkType.Template,
        );
        tv.PutRequest.Item['siSort2'] = tv.PutRequest.Item.sk;
        params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(tv);

        if ((template.components?.length ?? 0) > 0) {
            template.components.forEach((component) => {
                ow(component.key, ow.string.nonEmpty);

                // current component items
                const c = {
                    PutRequest: {
                        Item: {
                            pk: templateDbId,
                            sk: createDelimitedAttribute(
                                PkType.TemplateVersion,
                                'current',
                                PkType.Component,
                                component.key,
                            ),
                            key: component.key,
                            version: component.version,
                            configurationUpdate: component.configurationUpdate,
                            runWith: component.runWith,
                        },
                    },
                };
                params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(c);

                // add versioned component items
                const cv = clone(c);
                const versionedComponentDbId = createDelimitedAttribute(
                    PkType.TemplateVersion,
                    template.version,
                    PkType.Component,
                    component.key,
                );
                cv.PutRequest.Item.sk = versionedComponentDbId;
                params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(cv);
            });
        }

        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('SAVE_TEMPLATE_FAILED');
        }

        logger.debug(`templates.dao save: exit:`);
    }

    public async associateDeployment(template: TemplateItem): Promise<void> {
        logger.debug(
            `templates.dao associateDeployment: in: template:${JSON.stringify(template)}`,
        );

        const params: PutCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            Item: {
                pk: createDelimitedAttribute(PkType.Template, template.name),
                sk: createDelimitedAttribute(
                    PkType.TemplateVersion,
                    template.version,
                    'deployment',
                ),
                siKey2: createDelimitedAttribute(PkType.Deployment, template.deployment.id),
                siSort2: createDelimitedAttribute(PkType.Deployment, template.deployment.jobId),
                siKey3: createDelimitedAttribute(PkType.IotJob, template.deployment.jobId),
                siSort3: createDelimitedAttribute(PkType.Deployment, template.deployment.id),
                name: template.name,
                version: template.version,
                deployment: template.deployment.id,
                jobId: template.deployment.jobId,
                thingGroupName: template.deployment.thingGroupName,
            },
        };

        await this.dbc.send(new PutCommand(params));

        logger.debug(`templates.dao associateDeployment: exit:`);
    }

    public async list(
        count?: number,
        lastEvaluated?: TemplateListPaginationKey,
    ): Promise<[TemplateItem[], TemplateListPaginationKey]> {
        logger.debug(
            `templates.dao list: in: count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated,
            )}`,
        );

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (lastEvaluated?.name) {
            exclusiveStartKey = {
                pk: createDelimitedAttribute(PkType.Template, lastEvaluated.name),
                siKey1: PkType.Template,
                sk: createDelimitedAttribute(PkType.TemplateVersion, 'current'),
            };
        }

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            IndexName: GSI1_INDEX_NAME,
            KeyConditionExpression: `#hash=:hash`,
            ExpressionAttributeNames: {
                '#hash': 'siKey1',
            },
            ExpressionAttributeValues: {
                ':hash': PkType.Template,
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        logger.silly(`templates.dao list: params: ${JSON.stringify(params)}`);

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('templates.dao list: exit: undefined');
            return [undefined, undefined];
        }
        logger.silly(`templates.dao list: results: ${JSON.stringify(results)}`);

        const response = this.assemble(results.Items);
        let paginationKey: TemplateListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedName = expandDelimitedAttribute(results.LastEvaluatedKey.pk)[1];
            paginationKey = {
                name: lastEvaluatedName,
            };
        }

        logger.debug(
            `templates.dao list: exit: response:${JSON.stringify(
                response,
            )}, paginationKey:${paginationKey}`,
        );
        return [response, paginationKey];
    }

    private assemble(items: DocumentDbClientItem[]): TemplateItem[] {
        logger.debug(`templates.dao assemble: items:${JSON.stringify(items)}`);
        if ((items?.length ?? 0) === 0) {
            return undefined;
        }

        const t: { [version: string]: TemplateItem } = {};
        const c: { [version: string]: Component[] } = {};
        items.forEach((item) => {
            const pk = expandDelimitedAttribute(item.pk);
            const sk = expandDelimitedAttribute(item.sk);
            const templateName = pk[1];
            const templateVersion = sk[1];
            const key = `${templateName}:::${templateVersion}`;

            if (sk.length === 2) {
                // template
                t[key] = {
                    name: item.name,
                    version: item.version,
                    jobConfig: item.jobConfig,
                    deploymentPolicies: item.deploymentPolicies,
                    components: [],
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt),
                };
            } else if (sk.length === 4 && sk[2] === PkType.Component) {
                // component
                if (!c[key]) {
                    c[key] = [];
                }
                c[key].push({
                    key: item.key,
                    version: item.version,
                    configurationUpdate: item.configurationUpdate,
                    runWith: item.runWith,
                });
            }
        });
        Object.keys(t).forEach((k) => {
            t[k].components = c[k];
        });
        logger.debug(`templates.dao assemble: exit:${JSON.stringify(t)}`);
        return Object.values(t);
    }

    public async delete(template: TemplateItem): Promise<void> {
        logger.debug(`templates.dao delete: in: template:${JSON.stringify(template)}`);

        const params: BatchWriteCommandInput = {
            RequestItems: {
                [process.env.AWS_DYNAMODB_TABLE_NAME]: [],
            },
        };

        // template
        const templateDbId = createDelimitedAttribute(PkType.Template, template.name);
        const t = {
            DeleteRequest: {
                Key: {
                    pk: templateDbId,
                    sk: createDelimitedAttributePrefix(PkType.TemplateVersion, template.version),
                },
            },
        };
        params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(t);

        // components
        if ((template.components?.length ?? 0) > 0) {
            template.components.forEach((component) => {
                const c = {
                    DeleteRequest: {
                        Key: {
                            pk: templateDbId,
                            sk: createDelimitedAttribute(
                                PkType.TemplateVersion,
                                template.version,
                                PkType.Component,
                                component.key,
                            ),
                        },
                    },
                };
                params.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push(c);
            });
        }

        logger.silly(`templates.dao get: BatchWriteCommandInput: ${JSON.stringify(params)}`);
        const result = await this.dynamoDbUtils.batchWriteAll(params);
        if (this.dynamoDbUtils.hasUnprocessedItems(result)) {
            throw new Error('DELETE_TEMPLATE_FAILED');
        }

        logger.debug(`templates.dao get: exit:}`);
    }
}

export type TemplateListPaginationKey = {
    name: string;
};

export type TemplateVersionListPaginationKey = {
    version: number;
};
