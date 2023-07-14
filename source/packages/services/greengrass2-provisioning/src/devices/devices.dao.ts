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
import {
    BatchWriteCommand,
    BatchWriteCommandInput,
    DynamoDBDocumentClient,
    QueryCommand,
    QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { inject, injectable } from 'inversify';
import { DynamoDbPaginationKey, GSI1_INDEX_NAME, GSI4_INDEX_NAME } from '../common/common.models';
import { Artifact } from '../cores/cores.models';
import { TYPES } from '../di/types';
import { DocumentDbClientItem } from '../utils/dynamoDb.util';
import { logger } from '@awssolutions/simple-cdf-logger';
import { createDelimitedAttribute, expandDelimitedAttribute, PkType } from '../utils/pkUtils.util';
import { DeviceItem } from './devices.model';

@injectable()
export class DevicesDao {
    private dbc: DynamoDBDocumentClient;

    public constructor(
        @inject(TYPES.DynamoDBDocumentFactory) ddcFactory: () => DynamoDBDocumentClient,
    ) {
        this.dbc = ddcFactory();
    }

    public async get(name: string): Promise<DeviceItem> {
        logger.debug(`devices.dao get: in: name:${name}`);

        const deviceDbId = createDelimitedAttribute(PkType.ClientDevice, name);

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            KeyConditionExpression: `#pk=:pk`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
            },
            ExpressionAttributeValues: {
                ':pk': deviceDbId,
            },
        };

        const result = await this.dbc.send(new QueryCommand(params));
        if ((result.Items?.length ?? 0) === 0) {
            logger.debug('devices.dao get: exit: undefined');
            return undefined;
        }

        const task = this.assemble(result.Items)?.[0];
        logger.debug(`devices.dao get: exit: ${JSON.stringify(task)}`);
        return task;
    }

    private assemble(items: DocumentDbClientItem[]): DeviceItem[] {
        logger.debug(`devices.dao assemble: in: items:${JSON.stringify(items)}`);
        if (items === undefined) {
            return undefined;
        }

        const c: { [thingName: string]: DeviceItem } = {};
        const a: { [thingName: string]: { [key: string]: Artifact } } = {};
        items.forEach((item) => {
            const pk = expandDelimitedAttribute(item.pk);
            const sk = expandDelimitedAttribute(item.sk);
            const thingName = pk[1];

            if (sk.length === 2 && sk[0] === PkType.ClientDevice) {
                // main client device item
                let coreName;

                if (item.siKey2) {
                    const sk2 = expandDelimitedAttribute(item.siKey2);
                    coreName = sk2[1];
                }

                c[thingName] = {
                    name: item.name,
                    coreName,
                    provisioningTemplate: item.provisioningTemplate,
                    provisioningParameters: item.provisioningParameters,
                    cdfProvisioningParameters: item.cdfProvisioningParameters,
                    taskStatus: item.taskStatus,
                    statusMessage: item.statusMessage,
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt),
                };
            } else if (
                sk.length === 4 &&
                sk[0] === PkType.ClientDevice &&
                sk[2] === PkType.Artifact
            ) {
                // core specific artifacts
                if (a[thingName] === undefined) {
                    a[thingName] = {};
                }
                const artifactKey = sk[3];
                a[thingName][artifactKey] = {
                    bucket: item.bucket,
                    key: item.key,
                    createdAt: new Date(item.createdAt),
                };
            }
        });

        Object.keys(c).forEach((k) => {
            c[k].artifacts = a[k];
        });

        const response = Object.values(c);
        logger.debug(`devices.dao assemble: exit:${JSON.stringify(response)}`);
        return response;
    }

    public async delete(name: string): Promise<void> {
        logger.debug(`devices.dao delete: in: name:${name}`);

        const coreDbId = createDelimitedAttribute(PkType.ClientDevice, name);

        const queryParams: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            KeyConditionExpression: `#pk=:pk`,
            ExpressionAttributeNames: {
                '#pk': 'pk',
            },
            ExpressionAttributeValues: {
                ':pk': coreDbId,
            },
        };

        const result = await this.dbc.send(new QueryCommand(queryParams));
        if ((result.Items?.length ?? 0) > 0) {
            const deleteParams: BatchWriteCommandInput = {
                RequestItems: {
                    [process.env.AWS_DYNAMODB_TABLE_NAME]: [],
                },
            };

            result.Items.forEach((item) => {
                deleteParams.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push({
                    DeleteRequest: {
                        Key: {
                            pk: item.pk,
                            sk: item.sk,
                        },
                    },
                });
            });

            await this.dbc.send(new BatchWriteCommand(deleteParams));
        }

        logger.debug('devices.dao delete: exit:');
    }

    public async list(
        failedOnly: boolean,
        count: number,
        exclusiveStart: DeviceListPaginationKey,
    ): Promise<[DeviceItem[], DeviceListPaginationKey]> {
        logger.debug(
            `devices.dao list: in: failedOnly:${failedOnly}, count:${count}, exclusiveStart:${JSON.stringify(
                exclusiveStart,
            )}`,
        );

        let params: QueryCommandInput;
        if (failedOnly) {
            params = this.generateListFilteredByFailedDeployments(count, exclusiveStart);
        } else {
            params = this.generateListQuery(count, exclusiveStart);
        }

        logger.silly(`devices.dao list: params: ${JSON.stringify(params)}`);

        const results = await this.dbc.send(new QueryCommand(params));
        if ((results?.Items?.length ?? 0) === 0) {
            logger.debug('devices.dao list: exit: undefined');
            return [undefined, undefined];
        }
        logger.silly(`devices.dao list: results: ${JSON.stringify(results)}`);

        const response = this.assemble(results.Items);
        let paginationKey: DeviceListPaginationKey;
        if (results.LastEvaluatedKey) {
            const lastEvaluatedThingName = expandDelimitedAttribute(
                results.LastEvaluatedKey.pk,
            )[1];
            paginationKey = {
                thingName: lastEvaluatedThingName,
            };
        }

        logger.debug(
            `cores.dao list: exit: response:${JSON.stringify(
                response,
            )}, paginationKey:${paginationKey}`,
        );
        return [response, paginationKey];
    }

    private generateListQuery(
        count?: number,
        exclusiveStart?: DeviceListPaginationKey,
    ): QueryCommandInput {
        let exclusiveStartKey: DynamoDbPaginationKey;
        if (exclusiveStart?.thingName) {
            exclusiveStartKey = {
                pk: createDelimitedAttribute(PkType.ClientDevice, exclusiveStart.thingName),
                sk: createDelimitedAttribute(PkType.ClientDevice, exclusiveStart.thingName),
                siKey1: PkType.ClientDevice,
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
                ':hash': PkType.ClientDevice,
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        return params;
    }

    private generateListFilteredByFailedDeployments(
        count?: number,
        exclusiveStart?: DeviceListPaginationKey,
    ): QueryCommandInput {
        const thingNameDbId = createDelimitedAttribute(
            PkType.ClientDevice,
            exclusiveStart.thingName,
        );

        let exclusiveStartKey: DynamoDbPaginationKey;
        if (exclusiveStart?.thingName) {
            exclusiveStartKey = {
                pk: thingNameDbId,
                sk: thingNameDbId,
            };
        }

        const indexName = GSI4_INDEX_NAME;
        const siKeyDbId = createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED');
        const hash = 'siKey4';
        if (exclusiveStart?.thingName) {
            exclusiveStartKey.siKey4 = siKeyDbId;
            exclusiveStartKey.siSort4 = thingNameDbId;
        }

        const params: QueryCommandInput = {
            TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
            IndexName: indexName,
            KeyConditionExpression: `#hash=:hash`,
            ExpressionAttributeNames: {
                '#hash': hash,
            },
            ExpressionAttributeValues: {
                ':hash': siKeyDbId,
            },
            Select: 'ALL_ATTRIBUTES',
            ExclusiveStartKey: exclusiveStartKey,
            Limit: count,
        };

        return params;
    }
}

export type DeviceListPaginationKey = {
    thingName: string;
};
