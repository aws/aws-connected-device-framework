/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';

@injectable()
export class FilterDao {

    // private _dc: AWS.DynamoDB.DocumentClient;

    // public constructor(
    //     @inject('aws.dynamoDb.tables.eventConfig.name') private eventConfigTable:string,
    //     @inject('aws.dynamoDb.tables.eventConfig.gsi3') private eventConfigGSI3:string,
    //     @inject('aws.dynamoDb.tables.eventConfig.partitions') private eventConfigPartitions:number,
	//     @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient
    // ) {
    //     this._dc = documentClientFactory();
    // }

}
