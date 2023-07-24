/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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
import { logger } from '@awssolutions/simple-cdf-logger';
import AWS from 'aws-sdk';
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import {
    PkType,
    createDelimitedAttribute,
    createDelimitedAttributePrefix,
} from '../utils/pkUtils.util';
import { ComponentItem } from './components.model';

@injectable()
export class ComponentsDao {
    private _dc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamodb.tables.accounts') private accountsTable: string,
        @inject(TYPES.DocumentClientFactory)
        documentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._dc = documentClientFactory();
    }

    public async createComponent(item: ComponentItem): Promise<void> {
        logger.debug(`components.dao create: in: item: ${JSON.stringify(item)}`);
        const {
            parameters,
            description,
            runOrder,
            organizationalUnitId,
            name,
            resourceFile,
            bypassCheck,
        } = item;
        await this._dc
            .put({
                TableName: this.accountsTable,
                Item: {
                    pk: createDelimitedAttribute(PkType.OrganizationalUnits, organizationalUnitId),
                    sk: createDelimitedAttribute(PkType.Components, name),
                    parameters,
                    description,
                    runOrder,
                    resourceFile,
                    bypassCheck,
                },
            })
            .promise();
        logger.debug(`components.dao create: exit:`);
    }

    private static assembleComponents(
        result: AWS.DynamoDB.DocumentClient.ItemList
    ): ComponentItem[] {
        logger.debug(`components.dao assemble: in: result: ${JSON.stringify(result)}`);
        const itemList = [];
        for (const item of result) {
            itemList.push(this.assembleComponent(item));
        }
        logger.debug(`components.dao assemble: exit: ${JSON.stringify(itemList)}`);
        return itemList;
    }

    private static assembleComponent(
        result: AWS.DynamoDB.DocumentClient.AttributeMap
    ): ComponentItem {
        logger.debug(`components.dao assembleComponent: in: result: ${JSON.stringify(result)}`);
        const { pk, sk, parameters, description, runOrder, resourceFile, bypassCheck } = result;

        const pkElements = pk.split(':');
        const skElements = sk.split(':');

        const item: ComponentItem = {
            organizationalUnitId: pkElements[1],
            name: skElements[1],
            parameters,
            description,
            runOrder,
            resourceFile,
            bypassCheck,
        };

        logger.debug(`accounts.dao assembleAccount: exit: ${JSON.stringify(item)}`);
        return item;
    }

    public async deleteComponentByOu(
        organizationalUnitId: string,
        componentName: string
    ): Promise<void> {
        logger.debug(
            `components.dao deleteComponent: in: organizationalUnitId:${organizationalUnitId} componentName:${componentName}`
        );

        await this._dc
            .delete({
                TableName: this.accountsTable,
                Key: {
                    pk: createDelimitedAttribute(PkType.OrganizationalUnits, organizationalUnitId),
                    sk: createDelimitedAttribute(PkType.Components, componentName),
                },
            })
            .promise();

        logger.debug(`components.dao deleteComponent: exit:`);
    }

    public async deleteComponentsByOu(organizationalUnitId: string): Promise<void> {
        logger.debug(
            `components.dao deleteComponents: in: organizationalUnitId:${organizationalUnitId}`
        );
        const components = await this.getComponentsByOu(organizationalUnitId);
        for (const component of components) {
            await this.deleteComponentByOu(organizationalUnitId, component.name);
        }
        logger.debug(`components.dao deleteComponents: exit:`);
    }

    public async getComponentsByOu(organizationalUnitId: string): Promise<ComponentItem[]> {
        logger.debug(`components.dao getComponentsByOu: in: ouName: ${organizationalUnitId}`);

        const queryResponse = await this._dc
            .query({
                TableName: this.accountsTable,
                KeyConditionExpression: 'pk = :pk and  begins_with(sk,:sk)',
                ExpressionAttributeValues: {
                    ':pk': createDelimitedAttributePrefix(
                        PkType.OrganizationalUnits,
                        organizationalUnitId
                    ),
                    ':sk': PkType.Components,
                },
            })
            .promise();

        if (queryResponse.Items.length === 0) {
            return [];
        }
        const itemList = ComponentsDao.assembleComponents(queryResponse.Items);
        logger.debug(`components.dao getComponentsByOu: ou: itemList: ${itemList}`);
        return itemList;
    }
}
