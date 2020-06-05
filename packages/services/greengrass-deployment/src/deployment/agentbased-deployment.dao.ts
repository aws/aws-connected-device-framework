/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import AWS = require('aws-sdk');
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { createDelimitedAttribute, PkType } from '../utils/pKUtils.util';

import { AssociationModel } from './deployment.model';

@injectable()
export class AgentbasedDeploymentDao {

    private dc: AWS.DynamoDB.DocumentClient;
    private readonly SI1_INDEX = 'sk-si1Sort-index';

    constructor(
        @inject('aws.dynamoDB.ggProvisioningTable') private provisioningTable: string,
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this.dc = documentClientFactory();
    }

    public async save(association: AssociationModel): Promise<void> {
        logger.debug(`agentbasedDeployment.dao: save: in: deployment: ${JSON.stringify(association)}`);

        const params = {
            TableName: this.provisioningTable,
            Item: {
                pk: createDelimitedAttribute(PkType.DeviceDeploymentAssociation, association.associationId),
                sk: createDelimitedAttribute(PkType.DeviceDeploymentAssociation, PkType.DeviceDeployment, 'map'),
                si1Sort: createDelimitedAttribute(PkType.DeviceDeployment, association.deploymentId),
                deploymentId: association.deploymentId
            }
        };

        await this.dc.put(params).promise();

        logger.debug(`agentbasedDeployment.dao: save: exit: `);
    }

    public async delete(association: AssociationModel): Promise<void> {
        logger.debug(`agentlessDeployment.dao: delete: in: deployment: ${JSON.stringify(association)}`);

        const params = {
            TableName: this.provisioningTable,
            Key: {
                pk: createDelimitedAttribute(PkType.DeviceDeploymentAssociation, association.associationId),
                sk: createDelimitedAttribute(PkType.DeviceDeploymentAssociation, PkType.DeviceDeployment, 'map'),
            }
        };

        await this.dc.delete(params).promise();

        logger.debug(`agentlessDeployment.dao delete: exit:`);
    }

    public async get(associationId: string): Promise<AssociationModel> {
        logger.debug(`agentbasedDeployment.dao: get: associationId: ${associationId}`);

        const params = {
            TableName: this.provisioningTable,
            Key: {
                pk: createDelimitedAttribute(PkType.DeviceDeploymentAssociation, associationId),
                sk: createDelimitedAttribute(PkType.DeviceDeploymentAssociation, PkType.DeviceDeployment, 'map'),
            }
        };

        const result = await this.dc.get(params).promise();
        if (result.Item===undefined) {
            logger.debug('agentbasedDeployments.dao exit: undefined');
            return undefined;
        }

        const i = result.Item;
        const pkElements = i.pk.split(':');

        const deploymentAssociation: AssociationModel = {
            deploymentId: i.deploymentId,
            associationId: pkElements[1],
        };

        logger.debug(`agentbaseddeployment.dao: list: exit: deploymentList: ${JSON.stringify(deploymentAssociation)}`);

        return deploymentAssociation;
    }

    public async getByDeploymentId(deploymentId: string) {
        logger.debug(`agentbasedDeployment.dao: get: deviceId: ${deploymentId}`);

        const params = {
            TableName: this.provisioningTable,
            IndexName: this.SI1_INDEX,
            KeyConditionExpression: `#pk=:pk AND begins_with(#sk,:sk)`,
            ExpressionAttributeNames: {
                '#pk': 'sk',
                '#sk': 'si1Sort'
            },
            ExpressionAttributeValues: {
                ':pk': createDelimitedAttribute(PkType.DeviceDeploymentAssociation, PkType.DeviceDeployment, 'map'),
                ':sk': createDelimitedAttribute(PkType.DeviceDeployment, deploymentId)
            }
        };

        const result = await this.dc.query(params).promise();
        if (result.Items===undefined || result.Items.length===0) {
            logger.debug('agentbasedDeployments.dao list: exit: undefined');
            return undefined;
        }

        const i = result.Items[0];
        const pkElements = i.pk.split(':');

        const deploymentAssociation: AssociationModel = {
            deploymentId: i.deploymentId,
            associationId: pkElements[1],
        };

        logger.debug(`agentbaseddeployment.dao: list: exit: deploymentList: ${JSON.stringify(deploymentAssociation)}`);

        return deploymentAssociation;
    }

}
