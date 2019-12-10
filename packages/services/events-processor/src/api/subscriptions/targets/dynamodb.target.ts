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

    public async validateTarget(tableName:string) : Promise<string> {
        logger.debug(`dynamoddb.target validateTarget: in: tableName:${tableName}`);

        // validate input
        ow(tableName, ow.string.nonEmpty);

        // see if the table already exists
        const exists = await this.tableExists(tableName);

        logger.debug(`dynamoddb.target validateTarget: exit: tableName:${tableName}, exists: ${exists}`);
        return tableName;
    }

    private async tableExists(tableName:string) : Promise<boolean> {
        logger.debug(`dynamodb.target tableExists: in: tableName:${tableName}`);

        let exists = false;
        try  {
            await this._dynamodDb.describeTable({TableName:tableName}).promise();
            exists = true;
        } catch (err) {
            logger.error(`dynamodb.target validate: error:${err.code}`);
            throw new Error(`INVALID_TABLE: Table ${tableName} not found.`);
        }

        logger.debug(`dynamodb.target tableExists: exit:${exists}`);
        return exists;
    }
}
