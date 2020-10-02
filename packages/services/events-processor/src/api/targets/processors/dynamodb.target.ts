/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This subscription code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/types';
import {logger} from '../../../utils/logger.util';
import ow from 'ow';

@injectable()
export class DynamodDBTarget  {

    private _dynamodDb: AWS.DynamoDB;

    public constructor(
	    @inject(TYPES.DynamoDBFactory) ddbFactory: () => AWS.DynamoDB
    ) {
        this._dynamodDb = ddbFactory();
    }

    public async ensureTableExists(tableName:string) : Promise<string> {
        logger.debug(`dynamoddb.target ensureTableExists: in: tableName:${tableName}`);

        // validate input
        ow(tableName, ow.string.nonEmpty);

        // see if the table already exists
        try  {
            await this._dynamodDb.describeTable({TableName:tableName}).promise();
        } catch (err) {
            logger.error(`dynamodb.target ensureTableExists: error:${err.code}`);
            throw new Error(`INVALID_TABLE: Table ${tableName} not found.`);
        }

        logger.debug(`dynamoddb.target validateTarget: exit:${tableName}`);
        return tableName;
    }

}
