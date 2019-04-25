/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { SubscriptionDao } from './subscription.dao';
import AWS from 'aws-sdk';
import { SubscriptionItem } from './subscription.models';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

describe('SubscriptionDao', () => {

    let mockedDocumentClient: AWS.DynamoDB.DocumentClient;
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
        alerted: false,
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
            sns: {
                arn: 'arn::sns'
            },
            iotCore: {
                topic: 'topic1'
            }
        },
        user: {
            id: 'user001'
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
                            principalValue: stubbedGoodItem.principalValue,
                            ruleParameterValues: stubbedGoodItem.ruleParameterValues,
                            enabled: stubbedGoodItem.enabled,
                            alerted: stubbedGoodItem.alerted,
                            gsi1Sort: `S:${stubbedGoodItem.enabled}:${stubbedGoodItem.id}`,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}`
                        }
                    }
                }, {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `E:${stubbedGoodItem.event.id}`,
                            name: stubbedGoodItem.event.name,
                            conditions: stubbedGoodItem.event.conditions,
                            principal: stubbedGoodItem.eventSource.principal,
                            eventSourceId: stubbedGoodItem.eventSource.id,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:E:${stubbedGoodItem.event.id}`
                        }
                    }
                }, {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `U:${stubbedGoodItem.user.id}`,
                            gsi1Sort: `S:${stubbedGoodItem.enabled}:${stubbedGoodItem.id}`,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:U:${stubbedGoodItem.user.id}`
                        }
                    }
                }, {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:sns`,
                            arn: 'arn::sns',
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:sns`

                        }
                    }
                }, {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:iotCore`,
                            topic: 'topic1',
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:iotCore`

                        }
                    }
                }
            ]
        }
    };

    beforeEach(() => {
        mockedDocumentClient = new AWS.DynamoDB.DocumentClient();
        const mockedDocumentClientFactory = () => {
            return mockedDocumentClient;
        };
        mockedCachedDocumentClient = new AWS.DynamoDB.DocumentClient();
        const mockedCachedDocumentClientFactory = () => {
            return mockedCachedDocumentClient;
        };
        instance = new SubscriptionDao('eventConfig','gsiBucket-gsi3Sort-index',mockedDocumentClientFactory,mockedCachedDocumentClientFactory);
    });

    it('create saves succesful', async() => {

        // mocks
        const mockedBatchWrite = mockedDocumentClient.batchWrite = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => Promise.resolve({})
            };
        });

        // execute
        const si = stubbedGoodItem;
        await instance.create(si);

        // verification
        expect(mockedBatchWrite).toBeCalledWith(expectedFullBatchWriteFirstCall);

    });

    it('create with unprocessed items completes on second attempt', async() => {

        const si = stubbedGoodItem;

        // mocks
        // the first mock call to batchWrite returns with an unprocessed item
        const mockedBatchWrite = mockedDocumentClient.batchWrite = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => {
                  const r:DocumentClient.BatchWriteItemOutput = {
                    UnprocessedItems: {
                        eventConfig: [
                            {
                                PutRequest: {
                                    Item: {
                                        pk: `S:${si.id}`,
                                        sk: `ST:iotCore`,
                                        topic: 'topic1',
                                        gsi2Key: `ES:${si.eventSource.id}:${si.eventSource.principal}:${si.principalValue}`,
                                        gsi2Sort: `S:${si.id}:ST:iotCore`
                                    }
                                }
                            }
                        ]
                    }
                  };
                  return Promise.resolve(r);
              }
            };
        })
        // the second mock call to batchWrite returns success
        .mockImplementationOnce(()=> {
            return {
              promise: () => {
                return Promise.resolve({});
              }
            };
        });

        // execute
        await instance.create(si);

        // verification
        expect(mockedBatchWrite.mock.calls.length).toBe(2);

        expect(mockedBatchWrite.mock.calls[0][0]).toEqual(expectedFullBatchWriteFirstCall);

        const expectedBatchWriteSecondCall:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
                eventConfig: [
                    {
                        PutRequest: {
                            Item: {
                                pk: `S:${si.id}`,
                                sk: `ST:iotCore`,
                                topic: 'topic1',
                                gsi2Key: `ES:${si.eventSource.id}:${si.eventSource.principal}:${si.principalValue}`,
                                gsi2Sort: `S:${si.id}:ST:iotCore`
                            }
                        }
                    }
                ]
            }
        };
        expect(mockedBatchWrite.mock.calls[1][0]).toEqual(expectedBatchWriteSecondCall);

    });

    it('create with unprocessed items eventually throws error', async() => {

        const si = stubbedGoodItem;

        // mocks
        // the first mock call to batchWrite returns with an unprocessed item
        const mockedBatchWrite = mockedDocumentClient.batchWrite = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => {
                  const r:DocumentClient.BatchWriteItemOutput = {
                    UnprocessedItems: {
                        eventConfig: [
                            {
                                PutRequest: {
                                    Item: {
                                        pk: `S:${si.id}`,
                                        sk: `ST:iotCore`,
                                        topic: 'topic1',
                                        gsi2Key: `ES:${si.eventSource.id}:${si.eventSource.principal}:${si.principalValue}`,
                                        gsi2Sort: `S:${si.id}:ST:iotCore`
                                    }
                                }
                            }
                        ]
                    }
                  };
                  return Promise.resolve(r);
              }
            };
        })
        // the second mock also returns with an unprocessed item
        .mockImplementationOnce(()=> {
            return {
              promise: () => {
                const r:DocumentClient.BatchWriteItemOutput = {
                  UnprocessedItems: {
                      eventConfig: [
                          {
                            PutRequest: {
                                Item: {
                                    pk: `S:${si.id}`,
                                    sk: `ST:iotCore`,
                                    topic: 'topic1',
                                    gsi2Key: `ES:${si.eventSource.id}:${si.eventSource.principal}:${si.principalValue}`,
                                    gsi2Sort: `S:${si.id}:ST:iotCore`
                                }
                            }
                          }
                      ]
                  }
                };
                return Promise.resolve(r);
              }
            };
        });

        // execute
        try {
            await instance.create(si);
            fail('FAILED_SAVING_SUBSCRIPTION error should be thrown');
        } catch (e) {
            expect(e.message).toEqual('FAILED_SAVING_SUBSCRIPTION');
        }

        // verification
        expect(mockedBatchWrite.mock.calls.length).toBe(2);

        expect(mockedBatchWrite.mock.calls[0][0]).toEqual(expectedFullBatchWriteFirstCall);

        const expectedBatchWriteSecondCall:DocumentClient.BatchWriteItemInput = {
            RequestItems: {
                eventConfig: [
                    {
                        PutRequest: {
                            Item: {
                                pk: `S:${si.id}`,
                                sk: `ST:iotCore`,
                                topic: 'topic1',
                                gsi2Key: `ES:${si.eventSource.id}:${si.eventSource.principal}:${si.principalValue}`,
                                gsi2Sort: `S:${si.id}:ST:iotCore`
                            }
                        }
                    }
                ]
            }
        };
        expect(mockedBatchWrite.mock.calls[1][0]).toEqual(expectedBatchWriteSecondCall);
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
                            principalValue: stubbedGoodItem.principalValue,
                            ruleParameterValues: stubbedGoodItem.ruleParameterValues,
                            enabled: stubbedGoodItem.enabled,
                            alerted: stubbedGoodItem.alerted,
                            gsi1Sort: `S:${stubbedGoodItem.enabled}:${stubbedGoodItem.id}`,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}`
                        }, {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `E:${stubbedGoodItem.event.id}`,
                            name: stubbedGoodItem.event.name,
                            conditions: stubbedGoodItem.event.conditions,
                            principal: stubbedGoodItem.eventSource.principal,
                            eventSourceId: stubbedGoodItem.eventSource.id,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:E:${stubbedGoodItem.event.id}`
                        }, {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `U:${stubbedGoodItem.user.id}`,
                            gsi1Sort: `S:${stubbedGoodItem.enabled}:${stubbedGoodItem.id}`,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:U:${stubbedGoodItem.user.id}`
                        }, {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:sns`,
                            arn: 'arn::sns',
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:sns`
                        }, {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:iotCore`,
                            topic: 'topic1',
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:iotCore`
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
                IndexName: 'gsiBucket-gsi3Sort-index',
                KeyConditionExpression: '#key = :value',
                TableName: 'eventConfig'
            }
        );
        expect(actual).toEqual([stubbedGoodItem]);
    });
});
