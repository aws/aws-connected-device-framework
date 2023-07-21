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
import AWS = require('aws-sdk');
import { inject, injectable } from 'inversify';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import { PkType, createDelimitedAttribute } from '../utils/pKUtils.util';

import { AssociationModel } from './patch.model';

@injectable()
export class AgentbasedPatchDao {
    private dc: AWS.DynamoDB.DocumentClient;
    private readonly SI1_INDEX = 'sk-si1Sort-index';
    private readonly tableName = process.env.AWS_DYNAMODB_TABLE_NAME;

    constructor(
        @inject(TYPES.DocumentClientFactory)
        documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async save(association: AssociationModel): Promise<void> {
        logger.debug(`agentbasedPatch.dao: save: in: patch: ${JSON.stringify(association)}`);

        const params = {
            TableName: this.tableName,
            Item: {
                pk: createDelimitedAttribute(PkType.DevicePatch, association.patchId),
                sk: createDelimitedAttribute(
                    PkType.DevicePatch,
                    PkType.DevicePatchAssociation,
                    'map'
                ),
                si1Sort: createDelimitedAttribute(
                    PkType.DevicePatchAssociation,
                    association.associationId
                ),
                patchId: association.patchId,
                associationId: association.associationId,
            },
        };

        await this.dc.put(params).promise();

        logger.debug(`agentbasedPatch.dao: save: exit: `);
    }

    public async delete(association: AssociationModel): Promise<void> {
        logger.debug(`agentlessPatch.dao: delete: in: patch: ${JSON.stringify(association)}`);

        const params = {
            TableName: this.tableName,
            Key: {
                pk: createDelimitedAttribute(PkType.DevicePatch, association.patchId),
                sk: createDelimitedAttribute(
                    PkType.DevicePatch,
                    PkType.DevicePatchAssociation,
                    'map'
                ),
            },
        };

        await this.dc.delete(params).promise();

        logger.debug(`agentlessPatch.dao delete: exit:`);
    }

    public async getByAssociationId(associationId: string): Promise<AssociationModel> {
        logger.debug(`agentbasedPatch.dao: getByAssociationId: associationId: ${associationId}`);

        const params = {
            TableName: this.tableName,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'sk',
                '#sk': 'si1Sort',
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(
                    PkType.DevicePatch,
                    PkType.DevicePatchAssociation,
                    'map'
                ),
                ':sk': createDelimitedAttribute(PkType.DevicePatchAssociation, associationId),
            },
        };

        const result = await this.dc.query(params).promise();
        if (result.Items === undefined || result.Items.length === 0) {
            logger.debug('agentbasedPatchs.dao query: exit: undefined');
            return undefined;
        }

        const i = result.Items[0];
        const pkElements = i.pk.split(':');

        const patchAssociation: AssociationModel = {
            patchId: i.patchId,
            associationId: pkElements[1],
        };

        logger.debug(
            `agentbasedpatch.dao:getByAssociationId:out:${JSON.stringify(patchAssociation)}`
        );

        return patchAssociation;
    }

    public async getByPatchId(patchId: string): Promise<AssociationModel> {
        logger.debug(`agentbasedPatch.dao: getByPatchId: patchId: ${patchId}`);

        const params = {
            TableName: this.tableName,
            Key: {
                pk: createDelimitedAttribute(PkType.DevicePatch, patchId),
                sk: createDelimitedAttribute(
                    PkType.DevicePatch,
                    PkType.DevicePatchAssociation,
                    'map'
                ),
            },
        };

        const result = await this.dc.get(params).promise();
        if (result.Item === undefined) {
            logger.debug('agentbasedPatchs.dao exit: undefined');
            return undefined;
        }

        const i = result.Item;

        const patchAssociation: AssociationModel = {
            patchId: i.patchId,
            associationId: i.associationId,
        };

        logger.debug(`agentbasedpatch.dao:getByPatchId:out: ${JSON.stringify(patchAssociation)}`);

        return patchAssociation;
    }
}
