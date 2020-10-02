
/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import AWS from 'aws-sdk';

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
        const batch:AWS.DynamoDB.DocumentClient.BatchWriteItemInput = {
            RequestItems: {
                table1: [
                    { PutRequest: { Item: { seq: {S: '1'} } } },
                    { PutRequest: { Item: { seq: {S: '2'} } } }
                ],
                table2: [
                    { PutRequest: { Item: { seq: {S: '3'} } } },
                    { PutRequest: { Item: { seq: {S: '4'} } } },
                    { PutRequest: { Item: { seq: {S: '5'} } } },
                ]
            }
        };

        const expected:AWS.DynamoDB.DocumentClient.BatchWriteItemInput[] = [
            {
                RequestItems: {
                    table1: [
                        { PutRequest: { Item: { seq: {S: '1'} } } },
                        { PutRequest: { Item: { seq: {S: '2'} } } }
                    ],
                    table2: [
                        { PutRequest: { Item: { seq: {S: '3'} } } }
                    ]
                }
            },{
                RequestItems: {
                    table2: [
                        { PutRequest: { Item: { seq: {S: '4'} } } },
                        { PutRequest: { Item: { seq: {S: '5'} } } }
                    ]
                }
            }
        ];

        // execute
        const actual = instance.test___splitBatchWriteIntoChunks(batch, 3);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });

    it('unprocessed chunks are rejoined', () => {
        // stubs
        const unprocessed:AWS.DynamoDB.DocumentClient.BatchWriteItemOutput= {
            UnprocessedItems: {
                table1: [
                    { PutRequest: { Item: { seq: {S: '1'} } } },
                    { PutRequest: { Item: { seq: {S: '2'} } } }
                ],
                table2: [
                    { PutRequest: { Item: { seq: {S: '3'} } } }
                ]
            }
        };
        const remaining:AWS.DynamoDB.DocumentClient.BatchWriteItemInput[] = [
            {
                RequestItems: {
                    table2: [
                        { PutRequest: { Item: { seq: {S: '4'} } } }
                    ],
                    table3: [
                        { PutRequest: { Item: { seq: {S: '5'} } } },
                        { PutRequest: { Item: { seq: {S: '6'} } } }
                    ]
                }
            },
            {
                RequestItems: {
                    table4: [
                        { PutRequest: { Item: { seq: {S: '7'} } } },
                        { PutRequest: { Item: { seq: {S: '8'} } } }
                    ]
                }
            }
        ];

        const expected:AWS.DynamoDB.DocumentClient.BatchWriteItemOutput = {
            UnprocessedItems: {
                table1: [
                    { PutRequest: { Item: { seq: {S: '1'} } } },
                    { PutRequest: { Item: { seq: {S: '2'} } } }
                ],
                table2: [
                    { PutRequest: { Item: { seq: {S: '3'} } } },
                    { PutRequest: { Item: { seq: {S: '4'} } } }
                ],
                table3: [
                    { PutRequest: { Item: { seq: {S: '5'} } } },
                    { PutRequest: { Item: { seq: {S: '6'} } } }
                ],
                table4: [
                    { PutRequest: { Item: { seq: {S: '7'} } } },
                    { PutRequest: { Item: { seq: {S: '8'} } } }
                ]
            }
        };

        // execute
        const actual = instance.test___joinChunksIntoOutputBatchWrite(unprocessed, remaining);

        // verify
        expect(actual).toBeDefined();
        expect(actual).toEqual(expected);

    });

});
