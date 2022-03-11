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

import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';
import { createDelimitedAttribute, PkType } from '../utils/pKUtils.util';

import { AssociationModel } from './deployment.model';

@injectable()
export class AgentbasedDeploymentDao {

    private dc: AWS.DynamoDB.DocumentClient;
    private readonly SI1_INDEX = 'sk-si1Sort-index';
    private readonly tableName = process.env.AWS_DYNAMODB_TABLE_NAME

    constructor(
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async save(association: AssociationModel): Promise<void> {
        logger.debug(`agentbasedDeployment.dao: save: in: deployment: ${JSON.stringify(association)}`);

        const params = {
            TableName: this.tableName,
            Item: {
                pk: createDelimitedAttribute(PkType.DeviceDeploymentTask, association.deploymentId),
                sk: createDelimitedAttribute(PkType.DeviceDeploymentTask, PkType.DeviceDeploymentAssociation, 'map'),
                si1Sort: createDelimitedAttribute(PkType.DeviceDeploymentAssociation, association.associationId),
                deploymentId: association.deploymentId,
                associationId: association.associationId
            }
        };

        await this.dc.put(params).promise();

        logger.debug(`agentbasedDeployment.dao: save: exit: `);
    }

    public async delete(association: AssociationModel): Promise<void> {
        logger.debug(`agentlessDeployment.dao: delete: in: deployment: ${JSON.stringify(association)}`);

        const params = {
            TableName: this.tableName,
            Key: {
                pk: createDelimitedAttribute(PkType.DeviceDeploymentTask, association.deploymentId),
                sk: createDelimitedAttribute(PkType.DeviceDeploymentTask, PkType.DeviceDeploymentAssociation, 'map')
            }
        };

        await this.dc.delete(params).promise();

        logger.debug(`agentlessDeployment.dao delete: exit:`);
    }

    public async getByAssociationId(associationId: string): Promise<AssociationModel> {
        logger.debug(`agentbasedDeployment.dao: getByAssociationId: associationId: ${associationId}`);

        const params = {
            TableName: this.tableName,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'sk',
                '#sk': 'si1Sort'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.DeviceDeploymentTask, PkType.DeviceDeploymentAssociation, 'map'),
                ':sk': createDelimitedAttribute(PkType.DeviceDeploymentAssociation, associationId)
            }
        };

        const result = await this.dc.query(params).promise();
        if (result.Items===undefined || result.Items.length===0) {
            logger.debug('agentbasedDeployments.dao query: exit: undefined');
            return undefined;
        }

        const i = result.Items[0];
        const pkElements = i.pk.split(':');

        const deploymentAssociation: AssociationModel = {
            deploymentId: i.deploymentId,
            associationId: pkElements[1],
        };

        logger.debug(`agentbaseddeployment.dao:getByAssociationId:out:${JSON.stringify(deploymentAssociation)}`);

        return deploymentAssociation;
    }

    public async getByDeploymentId(deploymentId: string): Promise<AssociationModel> {
        logger.debug(`agentbasedDeployment.dao: getByDeploymentId: deploymentId: ${deploymentId}`);

        const params = {
            TableName: this.tableName,
            Key: {
                pk: createDelimitedAttribute(PkType.DeviceDeploymentTask, deploymentId),
                sk: createDelimitedAttribute(PkType.DeviceDeploymentTask, PkType.DeviceDeploymentAssociation, 'map')
            }
        };

        const result = await this.dc.get(params).promise();
        if (result.Item===undefined) {
            logger.debug('agentbasedDeployments.dao exit: undefined');
            return undefined;
        }

        const i = result.Item;

        const deploymentAssociation: AssociationModel = {
            deploymentId: i.deploymentId,
            associationId: i.associationId,
        };

        logger.debug(`agentbaseddeployment.dao:getByDeploymentId:out: ${JSON.stringify(deploymentAssociation)}`);

        return deploymentAssociation;
    }

}
