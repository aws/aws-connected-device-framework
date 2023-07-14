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
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { createDelimitedAttribute, PkType } from '../utils/pkUtils.util';
import { RunItem } from './runs.models';

@injectable()
export class RunsDao {
    private _dc: DocumentClient;
    private _simulationTable: string;
    private _deviceStateTable: string;

    public constructor(
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => DocumentClient,
    ) {
        this._dc = documentClientFactory();
        this._simulationTable = process.env.AWS_DYNAMODB_TABLE_SIMULATIONS;
        this._deviceStateTable = process.env.AWS_DYNAMODB_TABLE_STATE;
    }

    public async save(item: RunItem): Promise<void> {
        logger.debug(`runs.dao save: in: item:${JSON.stringify(item)}`);

        const simulationId = createDelimitedAttribute(PkType.Simulation, item.simulationId);
        const runId = createDelimitedAttribute(PkType.Run, item.id);

        const params: DocumentClient.PutItemInput = {
            TableName: this._simulationTable,
            Item: {
                pk: simulationId,
                sk: runId,
                simulationId: item.simulationId,
                deviceCount: item.deviceCount,
                status: item.status,
            },
        };

        logger.debug(`runs.dao save: params:${JSON.stringify(params)}`);

        await this._dc.put(params).promise();

        logger.debug(`runs.dao save: exit:`);
    }

    public async listDeviceState(simulationId: string): Promise<{ [key: string]: unknown }[]> {
        logger.debug(`runs.dao listDeviceState: in: simulationId:${simulationId}`);

        const params: DocumentClient.QueryInput = {
            TableName: this._deviceStateTable,
            KeyConditionExpression: `#key = :key`,
            ExpressionAttributeNames: {
                '#key': 'simulationId',
            },
            ExpressionAttributeValues: {
                ':key': simulationId,
            },
        };

        const results: { [key: string]: unknown }[] = [];
        while (true) {
            // eslint-disable-line no-constant-condition
            const response = await this._dc.query(params).promise();
            if (response.Items !== undefined) {
                results.push(...response.Items);
            }
            if (response.LastEvaluatedKey === undefined) {
                break;
            }
            params.ExclusiveStartKey = response.LastEvaluatedKey;
        }

        logger.debug(`runs.dao listDeviceState: exit:${JSON.stringify(results)}`);
        return results;
    }
}
