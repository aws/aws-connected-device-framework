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
import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { TYPES } from '../../../di/types';

@injectable()
export class DynamodDBTarget {
    private _dynamodDb: AWS.DynamoDB;

    public constructor(@inject(TYPES.DynamoDBFactory) ddbFactory: () => AWS.DynamoDB) {
        this._dynamodDb = ddbFactory();
    }

    public async ensureTableExists(tableName: string): Promise<string> {
        logger.debug(`dynamoddb.target ensureTableExists: in: tableName:${tableName}`);

        // validate input
        ow(tableName, ow.string.nonEmpty);

        // see if the table already exists
        try {
            await this._dynamodDb.describeTable({ TableName: tableName }).promise();
        } catch (err) {
            logger.error(`dynamodb.target ensureTableExists: error:${err.code}`);
            throw new Error(`INVALID_TABLE: Table ${tableName} not found.`);
        }

        logger.debug(`dynamoddb.target validateTarget: exit:${tableName}`);
        return tableName;
    }
}
