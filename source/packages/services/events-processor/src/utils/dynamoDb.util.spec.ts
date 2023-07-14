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
import AWS from 'aws-sdk';
import 'reflect-metadata';

import { DynamoDbUtils } from './dynamoDb.util';

describe('DynamoDbUtils', () => {
    let mockedDocumentClient: AWS.DynamoDB.DocumentClient;
    let instance: DynamoDbUtils;

    beforeEach(() => {
        mockedDocumentClient = new AWS.DynamoDB.DocumentClient();
        const mockedDocumentClientFactory = () => {
            return mockedDocumentClient;
        };
        instance = new DynamoDbUtils(mockedDocumentClientFactory);
    });

    it('a batch is split into chunks', () => {
        // stubs
        const batch: AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {
                table1: [
                    { PutRequest: { Item: { seq: { S: '1' } } } },
                    { PutRequest: { Item: { seq: { S: '2' } } } },
                ],
                table2: [
                    { PutRequest: { Item: { seq: { S: '3' } } } },
                    { PutRequest: { Item: { seq: { S: '4' } } } },
                    { PutRequest: { Item: { seq: { S: '5' } } } },
                ],
            },
        };

        const expected: AWS.DynamoDB.DocumentClient.BatchWriteItemInput[] = [
            {
                RequestItems: {
                    table1: [
                        { PutRequest: { Item: { seq: { S: '1' } } } },
                        { PutRequest: { Item: { seq: { S: '2' } } } },
                    ],
                    table2: [{ PutRequest: { Item: { seq: { S: '3' } } } }],
                },
            },
            {
                RequestItems: {
                    table2: [
                        { PutRequest: { Item: { seq: { S: '4' } } } },
                        { PutRequest: { Item: { seq: { S: '5' } } } },
                    ],
                },
            },
        ];

        // execute
        const actual = instance.test___splitBatchWriteIntoChunks(batch, 3);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);
    });

    it('unprocessed chunks are rejoined', () => {
        // stubs
        const unprocessed: AWS.DynamoDB.DocumentClient.BatchWriteItemOutput = {
            UnprocessedItems: {
                table1: [
                    { PutRequest: { Item: { seq: { S: '1' } } } },
                    { PutRequest: { Item: { seq: { S: '2' } } } },
                ],
                table2: [{ PutRequest: { Item: { seq: { S: '3' } } } }],
            },
        };
        const remaining: AWS.DynamoDB.DocumentClient.BatchWriteItemInput[] = [
            {
                RequestItems: {
                    table2: [{ PutRequest: { Item: { seq: { S: '4' } } } }],
                    table3: [
                        { PutRequest: { Item: { seq: { S: '5' } } } },
                        { PutRequest: { Item: { seq: { S: '6' } } } },
                    ],
                },
            },
            {
                RequestItems: {
                    table4: [
                        { PutRequest: { Item: { seq: { S: '7' } } } },
                        { PutRequest: { Item: { seq: { S: '8' } } } },
                    ],
                },
            },
        ];

        const expected: AWS.DynamoDB.DocumentClient.BatchWriteItemOutput = {
            UnprocessedItems: {
                table1: [
                    { PutRequest: { Item: { seq: { S: '1' } } } },
                    { PutRequest: { Item: { seq: { S: '2' } } } },
                ],
                table2: [
                    { PutRequest: { Item: { seq: { S: '3' } } } },
                    { PutRequest: { Item: { seq: { S: '4' } } } },
                ],
                table3: [
                    { PutRequest: { Item: { seq: { S: '5' } } } },
                    { PutRequest: { Item: { seq: { S: '6' } } } },
                ],
                table4: [
                    { PutRequest: { Item: { seq: { S: '7' } } } },
                    { PutRequest: { Item: { seq: { S: '8' } } } },
                ],
            },
        };

        // execute
        const actual = instance.test___joinChunksIntoOutputBatchWrite(unprocessed, remaining);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);
    });
});
