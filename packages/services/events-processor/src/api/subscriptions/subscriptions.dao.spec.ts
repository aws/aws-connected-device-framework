/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { SubscriptionDao } from './subscription.dao';
import AWS from 'aws-sdk';
import { SubscriptionItem } from './subscription.models';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DynamoDbUtils } from '../../utils/dynamoDb.util';
import { createMockInstance } from 'jest-create-mock-instance';

describe('SubscriptionDao', () => {

    let mockedDynamoDbUtils: jest.Mocked<DynamoDbUtils>;
    let mockedCachedDocumentClient: AWS.DynamoDB.DocumentClient;
    let instance: SubscriptionDao;

    // stubs
    const stubbedGoodItem:SubscriptionItem = {
        id: 'sub0001',
        principalValue: 'device001',
        ruleParameterValues: {
            param1: 'value1'
        },
        enabled: true,
        event: {
            id: 'event001',
            name: 'lowBatteryLevelWarning',
            conditions: {
                all: [{
                    fact: 'batteryLevel',
                    operator: 'lessThanInclusive',
                    value: 20
                }]
            }
        },
        eventSource: {
            id: 'eventsource001',
            principal: 'deviceId'
        },
        targets: {
            email: {
                address: 'someone@somewhere.com'
            },
            sms: {
                phoneNumber: '555555555'
            }
        },
        user: {
            id: 'user001'
        },
        sns: {
            topicArn: 'sns:topic:arn'
        }
    };

    const expectedFullBatchWriteFirstCall:DocumentClient.BatchWriteItemInput = {
        RequestItems: {
            eventConfig: [
                {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `S:${stubbedGoodItem.id}`,
                            gsi1Sort: `E:${stubbedGoodItem.event.id}`,
                            enabled: stubbedGoodItem.enabled,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}`,
                            principalValue: stubbedGoodItem.principalValue,
                            ruleParameterValues: stubbedGoodItem.ruleParameterValues,
                            snsTopicArn: stubbedGoodItem.sns.topicArn,
                        }
                    }
                }, {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `E:${stubbedGoodItem.event.id}`,
                            gsi1Sort: `S:${stubbedGoodItem.id}`,
                            name: stubbedGoodItem.event.name,
                            principal: stubbedGoodItem.eventSource.principal,
                            conditions: stubbedGoodItem.event.conditions,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:E:${stubbedGoodItem.event.id}`,
                            eventSourceId: stubbedGoodItem.eventSource.id
                        }
                    }
                }, {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `U:${stubbedGoodItem.user.id}`,
                            gsi1Sort: `S:${stubbedGoodItem.enabled}:${stubbedGoodItem.id}`,
                            name: stubbedGoodItem.event.name,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:U:${stubbedGoodItem.user.id}`
                        }
                    }
                }, {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:email`,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:email`,
                            address: 'someone@somewhere.com',

                        }
                    }
                }, {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:sms`,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:sms`,
                            phoneNumber: '555555555',

                        }
                    }
                }
            ]
        }
    };

    beforeEach(() => {
        mockedDynamoDbUtils = createMockInstance(DynamoDbUtils);
        mockedCachedDocumentClient = new AWS.DynamoDB.DocumentClient();
        const mockedCachedDocumentClientFactory = () => {
            return mockedCachedDocumentClient;
        };
        instance = new SubscriptionDao('eventConfig','sk-gsi1Sort-index','gsi2Key-sk-index',
            mockedDynamoDbUtils,mockedCachedDocumentClientFactory);
    });

    it('create saves succesful', async() => {

        // mocks
        const mockedBatchWrite = mockedDynamoDbUtils.batchWriteAll = jest.fn().mockImplementationOnce(()=> undefined );
        mockedDynamoDbUtils.hasUnprocessedItems = jest.fn().mockImplementationOnce(()=> false);

        // execute
        const si = stubbedGoodItem;
        await instance.create(si);

        // verification
        expect(mockedBatchWrite).toBeCalledWith(expectedFullBatchWriteFirstCall);

    });

    it('create with unprocessed items throws error', async() => {

        const si = stubbedGoodItem;

        // mocks
        // the mock call to batchWrite returns with an unprocessed item
        const mockedBatchWrite = mockedDynamoDbUtils.batchWriteAll = jest.fn().mockImplementationOnce(()=> {
            const r:DocumentClient.BatchWriteItemOutput = {
                UnprocessedItems: {
                    eventConfig: [
                        {
                            PutRequest: {
                                Item: {
                                    pk: `S:${si.id}`,
                                    sk: `ST:email`,
                                    address: 'someone@somewhere.com',
                                    gsi2Key: `ES:${si.eventSource.id}:${si.eventSource.principal}:${si.principalValue}`,
                                    gsi2Sort: `S:${si.id}:ST:email`
                                }
                            }
                        }
                    ]
                }
            };
            return r;
        });
        mockedDynamoDbUtils.hasUnprocessedItems = jest.fn().mockImplementationOnce(()=> true);

        // execute
        try {
            await instance.create(si);
            fail('CREATE_SUBSCRIPTION_FAILED error should be thrown');
        } catch (e) {
            expect(e.message).toEqual('CREATE_SUBSCRIPTION_FAILED');
        }

        // verification
        expect(mockedBatchWrite.mock.calls.length).toBe(1);
        expect(mockedBatchWrite.mock.calls[0][0]).toEqual(expectedFullBatchWriteFirstCall);

    });

    it('list subscriptions for event message happy path', async() => {

        // stubs
        const eventSourceId = 'arn:aws:dynamodb:us-west-2:157731826412:table/deansTest';
        const principal = 'thingName';
        const principalValue = 'device001';
        const gsi2Key = `ES:${escape(eventSourceId)}:${principal}:${principalValue}`;

        // mocks
        const mockedQuery = mockedCachedDocumentClient.query = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => {
                  const r:DocumentClient.QueryOutput = {
                    Items: [
                        {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `S:${stubbedGoodItem.id}`,
                            gsi1Sort: `S:${stubbedGoodItem.id}`,
                            enabled: stubbedGoodItem.enabled,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}`,
                            principalValue: stubbedGoodItem.principalValue,
                            ruleParameterValues: stubbedGoodItem.ruleParameterValues,
                            snsTopicArn: 'sns:topic:arn',
                        }, {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `E:${stubbedGoodItem.event.id}`,
                            gsi1Sort: `S:${stubbedGoodItem.id}`,
                            name: stubbedGoodItem.event.name,
                            principal: stubbedGoodItem.eventSource.principal,
                            conditions: stubbedGoodItem.event.conditions,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:E:${stubbedGoodItem.event.id}`,
                            eventSourceId: stubbedGoodItem.eventSource.id,
                        }, {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `U:${stubbedGoodItem.user.id}`,
                            gsi1Sort: `S:${stubbedGoodItem.enabled}:${stubbedGoodItem.id}`,
                            name: stubbedGoodItem.event.name,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:U:${stubbedGoodItem.user.id}`
                        }, {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:email`,
                            address: 'someone@somewhere.com',
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:email`
                        }, {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:sms`,
                            phoneNumber: '555555555',
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:sms`
                        }
                    ]
                };
                return Promise.resolve(r);
              }
            };
        });

        // execute
        const actual = await instance.listSubscriptionsForEventMessage(eventSourceId, principal, principalValue);

        // verify
        expect(mockedQuery).toBeCalledWith({
            ExpressionAttributeNames: {
                '#key': 'gsi2Key'},
                ExpressionAttributeValues: {
                    ':value': gsi2Key
                },
                IndexName: 'gsi2Key-sk-index',
                KeyConditionExpression: '#key = :value',
                TableName: 'eventConfig'
            }
        );
        expect(actual).toEqual([stubbedGoodItem]);
    });
});
