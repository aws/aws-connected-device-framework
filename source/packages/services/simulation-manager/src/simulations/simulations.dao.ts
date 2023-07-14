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
import { createDelimitedAttribute, expandDelimitedAttribute, PkType } from '../utils/pkUtils.util';
import { SimulationItem, SimulationStatus } from './simulations.model';

@injectable()
export class SimulationsDao {
    private _dc: DocumentClient;
    private _table: string;

    public constructor(
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => DocumentClient,
    ) {
        this._dc = documentClientFactory();
        this._table = process.env.AWS_DYNAMODB_TABLE_SIMULATIONS;
    }

    public async save(item: SimulationItem): Promise<void> {
        logger.debug(`simulations.dao save: in: item:${JSON.stringify(item)}`);

        const simulationId = createDelimitedAttribute(PkType.Simulation, item.id);

        const params: DocumentClient.PutItemInput = {
            TableName: this._table,
            Item: {
                pk: simulationId,
                sk: PkType.Simulation,
                simulationId: item.id,
                name: item.name,
                deviceCount: item.deviceCount,
                status: item.status,
                tasks: item.tasks,
            },
        };

        if (item.modules) {
            params.Item['modules'] = item.modules;
        }

        logger.debug(`simulations.dao save: params:${JSON.stringify(params)}`);

        await this._dc.put(params).promise();

        logger.debug(`simulations.dao save: exit:`);
    }

    public async get(simulationId: string): Promise<SimulationItem> {
        logger.debug(`simulations.dao get: in: simulationId:${simulationId}`);

        const dbId = createDelimitedAttribute(PkType.Simulation, simulationId);

        const params: DocumentClient.QueryInput = {
            TableName: this._table,
            KeyConditionExpression: `#key = :key AND #range = :range`,
            ExpressionAttributeNames: {
                '#key': 'pk',
                '#range': 'sk',
            },
            ExpressionAttributeValues: {
                ':key': dbId,
                ':range': PkType.Simulation,
            },
        };

        const result = await this._dc.query(params).promise();
        if (result.Items === undefined) {
            logger.debug('simulations.dao get: exit: undefined');
            return undefined;
        }

        const simulation = this.assemble(result.Items[0]);

        logger.debug(`simulations.dao get: exit:${JSON.stringify(simulation)}`);
        return simulation;
    }

    public async updateStatus(
        simulationId: string,
        status: SimulationStatus,
    ): Promise<SimulationItem> {
        logger.debug(
            `simulations.dao updateStatus: in: simulationId:${simulationId}, status:${status}`,
        );

        const dbId = createDelimitedAttribute(PkType.Simulation, simulationId);

        const params: DocumentClient.UpdateItemInput = {
            TableName: this._table,
            Key: {
                pk: dbId,
                sk: dbId,
            },
            UpdateExpression: 'SET #s = :s',
            ExpressionAttributeNames: {
                '#s': 'status',
            },
            ExpressionAttributeValues: {
                ':s': status,
            },
            ReturnValues: 'ALL_NEW',
        };

        const result = await this._dc.update(params).promise();
        if (result.Attributes === undefined) {
            logger.debug('simulations.dao updateStatus: exit: undefined');
            return undefined;
        }

        const a = result.Attributes;

        const item = this.assemble(a);

        logger.debug(`simulations.dao updateStatus: exit: item:${item}`);

        return item;
    }

    private assemble(a: DocumentClient.AttributeMap): SimulationItem {
        const item: SimulationItem = {
            id: expandDelimitedAttribute(a.pk)[1],
            name: a.name,
            deviceCount: a.deviceCount,
            status: a.status,
            tasks: a.tasks,
            modules: a.modules,
        };

        return item;
    }

    public async incrementBatchProgress(
        simulationId: string,
    ): Promise<{ total: number; completed: number }> {
        logger.debug(`simulations.dao incrementBatchProgress: in: simulationId:${simulationId}`);

        const params: DocumentClient.UpdateItemInput = {
            TableName: this._table,
            Key: {
                pk: simulationId,
                sk: simulationId,
            },
            UpdateExpression: 'SET #c = #c + 1',
            ExpressionAttributeNames: {
                '#c': 'completed',
            },
            ReturnValues: 'ALL_NEW',
        };

        const results = await this._dc.update(params).promise();
        if (results.Attributes === undefined) {
            logger.debug('simulations.dao incrementBatchProgress: exit: undefined');
            return undefined;
        }

        const total = results.Attributes['total'] as number;
        const completed = results.Attributes['completed'] as number;

        logger.debug(
            `simulations.dao incrementBatchProgress: exit: total:${total}, completed:${completed}`,
        );

        return { total, completed };
    }
}
