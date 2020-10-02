/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../../utils/logger.util';
import { TYPES } from '../../di/types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { createDelimitedAttribute, PkType, expandDelimitedAttribute } from '../../utils/pkUtils.util';
import { TargetItem, TargetTypeStrings, TargetItemFactory } from './targets.models';

@injectable()
export class TargetDao {

    private _cachedDc: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
	    @inject(TYPES.CachableDocumentClientFactory) cachableDocumentClientFactory: () => AWS.DynamoDB.DocumentClient
    ) {
        this._cachedDc = cachableDocumentClientFactory();
    }

    /**
     * Creates the Target DynamoDB buildPutItemAttributeMap:
     *   Target(s):     pk='S-{subscriptionId}, sk='ST-{targetType}-{targetId}'
     */
    public buildPutItemAttributeMap(item:TargetItem, eventSourceId:string, principal:string, principalValue:string ) : DocumentClient.PutItemInputAttributeMap {
        logger.debug(`target.dao buildPutItemAttributeMap: item:${JSON.stringify(item)}, eventSourceId:${eventSourceId}, principal:${principal}, principalValue:${principalValue}`);

        const putItemAttributeMap:DocumentClient.PutItemInputAttributeMap =  {
            pk: createDelimitedAttribute(PkType.Subscription, item.subscriptionId),
            sk: createDelimitedAttribute(PkType.SubscriptionTarget, item.targetType, item.getId()),
            gsi2Key:createDelimitedAttribute(PkType.EventSource, eventSourceId, principal, principalValue),
            gsi2Sort: createDelimitedAttribute(PkType.Subscription, item.subscriptionId, PkType.SubscriptionTarget, item.targetType, item.getId())
        };

        for (const prop of Object.keys(item)) {
            const value = item[prop];
            if (value !== undefined) {
                putItemAttributeMap[prop]= item[prop];
            }
        }

        logger.debug(`target.dao buildPutItemAttributeMap: exit:${JSON.stringify(putItemAttributeMap)}`);
        return putItemAttributeMap;
    }

    /**
     * Creates the Subscription DynamoDB items:
     *   Target(s):     pk='S-{subscriptionId}, sk='ST-{targetType}-{targetId}'
     * @param subscription
     */
    public async create(item:TargetItem, eventSourceId:string, principal:string, principalValue:string ) : Promise<void> {
        logger.debug(`target.dao create: item:${JSON.stringify(item)}, eventSourceId:${eventSourceId}, principal:${principal}, principalValue:${principalValue}`);

        const putItemAttributeMap:DocumentClient.PutItemInputAttributeMap = this.buildPutItemAttributeMap(item, eventSourceId, principal, principalValue);

        await this._cachedDc.put({
            TableName: this.eventConfigTable,
            Item: putItemAttributeMap
        }).promise();

        logger.debug(`subscriptions.dao create: exit:`);
    }

    public async delete(subscriptionId:string, targetType:string, targetId:string): Promise<void> {
        logger.debug(`target.dao delete: subscriptionId:${subscriptionId}, targetType:${targetType}, targetId:${targetId}`);

        const pk = createDelimitedAttribute(PkType.Subscription, subscriptionId );
        const sk = createDelimitedAttribute(PkType.SubscriptionTarget, targetType, targetId );

        const params:DocumentClient.DeleteItemInput = {
            TableName: this.eventConfigTable,
            Key: { pk, sk }
        };

        await this._cachedDc.delete(params).promise();

        logger.debug(`target.dao delete: exit:`);
    }

    public async get<T extends TargetItem>(subscriptionId:string, targetType:string, targetId:string): Promise<T> {
        logger.debug(`target.dao get: subscriptionId:${subscriptionId}, targetType:${targetType}, targetId:${targetId}`);

        const pk = createDelimitedAttribute(PkType.Subscription, subscriptionId );
        const sk = createDelimitedAttribute(PkType.SubscriptionTarget, targetType, targetId );

        const params:DocumentClient.GetItemInput = {
            TableName: this.eventConfigTable,
            Key: { pk, sk }
        };

        const data = await this._cachedDc.get(params).promise();
        const item = this.assemble(data);

        logger.debug(`target.dao get: exit:${JSON.stringify(item)}`);
        return item as T;
    }

    public async update(item:TargetItem): Promise<void> {
        logger.debug(`target.dao update: in: item:${JSON.stringify(item)}`);

        const pk = createDelimitedAttribute(PkType.Subscription, item.subscriptionId );
        const sk = createDelimitedAttribute(PkType.SubscriptionTarget, item.targetType, item.getId() );
        const params = {
            TableName: this.eventConfigTable,
            Key: { pk, sk },
            UpdateExpression: '',
            ExpressionAttributeValues: {}
        };

        Object.keys(item).forEach(k=> {
            if (item.hasOwnProperty(k) ) {
                if (params.UpdateExpression==='') {
                    params.UpdateExpression+='set ';
                } else {
                    params.UpdateExpression+=', ';
                }
                params.UpdateExpression += `${k} = :${k}`;

                params.ExpressionAttributeValues[`:${k}`] = item[k];
            }
        });

        await this._cachedDc.update(params).promise();

        logger.debug(`target.dao update: exit:`);
    }

    public assemble<T extends TargetItem>(data:AWS.DynamoDB.DocumentClient.AttributeMap) : T {
        logger.debug(`target.dao assemble: in data: ${JSON.stringify(data)}`);

        const subscriptionId = expandDelimitedAttribute(data.Item['pk'])[1];
        const sk = <string>data.Item['sk'];
        const targetType = expandDelimitedAttribute(sk)[1] as TargetTypeStrings;

        const t = TargetItemFactory.getTargetItem(targetType);
        t.subscriptionId = subscriptionId;

        Object.keys(data.Item)
            .filter(k=> k!=='pk' && k!=='sk' && k!=='gsi2Key' && k!=='gsi2Sort')
            .forEach(k=> t[k]=data.Item[k]);

        logger.debug(`target.dao assemble: exit:${JSON.stringify(t)}`);
        return t as T;

    }

}
