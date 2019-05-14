/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This eventSource code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';
import { EventSourceDetailResource } from '../eventsource.models';
import { EventSource } from './source.interface';

@injectable()
export class DynamoDbEventSource implements EventSource  {

    private ddb: AWS.DynamoDB;
    private lambda: AWS.Lambda;

    constructor(
        @inject('aws.lambda.dynamoDbStream.name') private dynamoDbStreamEntryLambda:string,
	    @inject(TYPES.DynamoDBFactory) dynamoDBFactory: () => AWS.DynamoDB,
        @inject(TYPES.LambdaFactory) lambdaFactory: () => AWS.Lambda) {
            this.ddb = dynamoDBFactory();
            this.lambda = lambdaFactory();
        }

    public async create(model:EventSourceDetailResource) : Promise<void> {
        logger.debug(`dynamodb.source create: in: model:${JSON.stringify(model)}`);

        ow(model, ow.object.nonEmpty);
        ow(model.dynamoDb, ow.object.nonEmpty);
        ow(model.dynamoDb.tableName, ow.string.nonEmpty);

        const table = model.dynamoDb.tableName;

        // check to see if stream already exists on table
        let tableInfo: AWS.DynamoDB.Types.DescribeTableOutput;
        try  {
            tableInfo = await this.ddb.describeTable({TableName:table}).promise();
        } catch (err) {
            logger.error(`dynamodb.source create: error:${err.code}`);
            throw new Error(`INVALID_TABLE: Table ${table} not found.`);
        }

        // if streams are not enabled, configure it
        if (tableInfo.Table.StreamSpecification === undefined || tableInfo.Table.StreamSpecification.StreamEnabled===false) {
            logger.debug(`dynamodb.source create: Stream not enabled for table ${table}, therefore enabling`);
            const updateParams: AWS.DynamoDB.UpdateTableInput = {
                TableName: table,
                StreamSpecification: {
                    StreamEnabled: true,
                    StreamViewType: 'NEW_IMAGE'
                }
            };
            await this.ddb.updateTable(updateParams).promise();
            tableInfo = await this.ddb.describeTable({TableName:table}).promise();
        }

        // wire up the event source mapping
        const listParams:AWS.Lambda.Types.ListEventSourceMappingsRequest = {
            EventSourceArn: tableInfo.Table.LatestStreamArn,
            FunctionName: this.dynamoDbStreamEntryLambda
        };
        const eventSources = await this.lambda.listEventSourceMappings(listParams).promise();
        if (eventSources.EventSourceMappings.length===0) {
            const createParams:AWS.Lambda.Types.CreateEventSourceMappingRequest = {
                EventSourceArn: tableInfo.Table.LatestStreamArn,
                FunctionName: this.dynamoDbStreamEntryLambda,
                Enabled: true,
                StartingPosition: 'LATEST'
            };
            await this.lambda.createEventSourceMapping(createParams).promise();
        }

        logger.debug(`dynamodb.source create: exit:`);
    }

    public async delete(eventSourceId:string) : Promise<void> {
        logger.debug(`dynamodb.source delete: in: eventSourceId:${eventSourceId}`);

        // nothing to do, as we intentionally do not remove the dynamodb stream
        // as we cannot be confident that no-one else has started consuming it

        logger.debug(`dynamodb.source delete: exit:`);
    }

}
