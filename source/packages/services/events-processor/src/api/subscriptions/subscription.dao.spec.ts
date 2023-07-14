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
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { createMockInstance } from 'jest-create-mock-instance';
import 'reflect-metadata';
import { DynamoDbUtils } from '../../utils/dynamoDb.util';
import { TargetDao } from '../targets/target.dao';
import { EmailTargetItem, PushTargetItem, SMSTargetItem } from '../targets/targets.models';
import { SubscriptionDao } from './subscription.dao';
import { SubscriptionItem } from './subscription.models';

describe('SubscriptionDao', () => {
    let mockedTargetDao: jest.Mocked<TargetDao>;
    let mockedDynamoDbUtils: jest.Mocked<DynamoDbUtils>;
    let mockedCachedDocumentClient: AWS.DynamoDB.DocumentClient;
    let instance: SubscriptionDao;

    // stubs
    const stubbedGoodItem: SubscriptionItem = {
        id: 'sub0001',
        principalValue: 'device001',
        ruleParameterValues: {
            param1: 'value1',
        },
        enabled: true,
        event: {
            id: 'event001',
            name: 'lowBatteryLevelWarning',
            conditions: {
                all: [
                    {
                        fact: 'batteryLevel',
                        operator: 'lessThanInclusive',
                        value: 20,
                    },
                ],
            },
            disableAlertThreshold: false,
        },
        targets: {
            email: [],
            sms: [],
            push_gcm: [],
        },
        eventSource: {
            id: 'eventsource001',
            principal: 'deviceId',
        },
        user: {
            id: 'user001',
        },
        sns: {
            topicArn: 'sns:topic:arn',
        },
    };

    const email1 = new EmailTargetItem();
    email1.address = 'someone@somewhere.com';
    email1.subscriptionId = 'sub1';

    const sms1 = new SMSTargetItem();
    sms1.phoneNumber = '5555555555';
    sms1.subscriptionId = 'sub1';

    const pushGcm = new PushTargetItem();
    pushGcm.platformApplicationArn = 'arn:aws:sns:us-west-2:123456789012:app/GCM/MyApplication';
    pushGcm.token = 'EXAMPLE12345';
    pushGcm.platformEndpointArn =
        'arn:aws:sns:us-west-2:123456789012:endpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234';
    pushGcm.subscriptionId = 'sub1';

    stubbedGoodItem.targets.email.push(email1);
    stubbedGoodItem.targets.sms.push(sms1);
    stubbedGoodItem.targets.push_gcm.push(pushGcm);

    const expectedFullBatchWriteFirstCall: DocumentClient.BatchWriteItemInput = {
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
                        },
                    },
                },
                {
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
                            eventSourceId: stubbedGoodItem.eventSource.id,
                            disableAlertThreshold: false,
                        },
                    },
                },
                {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `U:${stubbedGoodItem.user.id}`,
                            gsi1Sort: `S:${stubbedGoodItem.enabled}:${stubbedGoodItem.id}`,
                            name: stubbedGoodItem.event.name,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:U:${stubbedGoodItem.user.id}`,
                        },
                    },
                },
                {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:email:someone@somewhere.com`,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:email:someone@somewhere.com`,
                            address: 'someone@somewhere.com',
                        },
                    },
                },
                {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:sms:5555555555`,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:sms:5555555555`,
                            phoneNumber: '5555555555',
                        },
                    },
                },
                {
                    PutRequest: {
                        Item: {
                            pk: `S:${stubbedGoodItem.id}`,
                            sk: `ST:push_gcm:arn%3Aaws%3Asns%3Aus-west-2%3A123456789012%3Aendpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234`,
                            gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                            gsi2Sort: `S:${stubbedGoodItem.id}:ST:push_gcm:arn%3Aaws%3Asns%3Aus-west-2%3A123456789012%3Aendpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234`,
                            platformApplicationArn:
                                'arn:aws:sns:us-west-2:123456789012:app/GCM/MyApplication',
                            platformEndpointArn:
                                'arn:aws:sns:us-west-2:123456789012:endpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234',
                            token: 'EXAMPLE12345',
                        },
                    },
                },
            ],
        },
    };

    beforeEach(() => {
        mockedTargetDao = createMockInstance(TargetDao);
        mockedDynamoDbUtils = createMockInstance(DynamoDbUtils);
        mockedCachedDocumentClient = new AWS.DynamoDB.DocumentClient();
        const mockedCachedDocumentClientFactory = () => {
            return mockedCachedDocumentClient;
        };
        instance = new SubscriptionDao(
            'eventConfig',
            'sk-gsi1Sort-index',
            'gsi2Key-sk-index',
            'gsi2Key-gsi2Sort-index',
            mockedTargetDao,
            mockedDynamoDbUtils,
            mockedCachedDocumentClientFactory,
        );
    });

    it('create subscription saves succesful', async () => {
        // mocks
        mockBuildPutItemAttributeMap(mockedTargetDao, stubbedGoodItem);

        const mockedBatchWrite = (mockedDynamoDbUtils.batchWriteAll = jest
            .fn()
            .mockImplementationOnce(() => undefined));
        mockedDynamoDbUtils.hasUnprocessedItems = jest.fn().mockImplementationOnce(() => false);

        // execute
        const si = stubbedGoodItem;
        await instance.create(si);

        // verification
        expect(mockedBatchWrite).toBeCalledWith(expectedFullBatchWriteFirstCall);
    });

    it('create with unprocessed items throws error', async () => {
        const si = stubbedGoodItem;

        // mocks
        mockBuildPutItemAttributeMap(mockedTargetDao, stubbedGoodItem);

        // the mock call to batchWrite returns with an unprocessed item
        const mockedBatchWrite = (mockedDynamoDbUtils.batchWriteAll = jest
            .fn()
            .mockImplementationOnce(() => {
                const r: DocumentClient.BatchWriteItemOutput = {
                    UnprocessedItems: {
                        eventConfig: [
                            {
                                PutRequest: {
                                    Item: {
                                        pk: `S:${si.id}`,
                                        sk: `ST:email:someone@somewhere.com`,
                                        address: 'someone@somewhere.com',
                                        gsi2Key: `ES:${si.eventSource.id}:${si.eventSource.principal}:${si.principalValue}`,
                                        gsi2Sort: `S:${si.id}:ST:email:someone@somewhere.com`,
                                    },
                                },
                            },
                        ],
                    },
                };
                return r;
            }));
        mockedDynamoDbUtils.hasUnprocessedItems = jest.fn().mockImplementationOnce(() => true);

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

    it('list subscriptions for event message happy path', async () => {
        // stubs
        const eventSourceId = 'arn:aws:dynamodb:us-west-2:xxxxxxxxxxxx:table/deansTest';
        const principal = 'thingName';
        const principalValue = 'device001';

        // mocks
        const mockedQuery = (mockedCachedDocumentClient.query = jest
            .fn()
            .mockImplementationOnce(() => {
                return {
                    promise: () => {
                        const r: DocumentClient.QueryOutput = {
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
                                },
                                {
                                    pk: `S:${stubbedGoodItem.id}`,
                                    sk: `E:${stubbedGoodItem.event.id}`,
                                    gsi1Sort: `S:${stubbedGoodItem.id}`,
                                    name: stubbedGoodItem.event.name,
                                    principal: stubbedGoodItem.eventSource.principal,
                                    conditions: stubbedGoodItem.event.conditions,
                                    gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                                    gsi2Sort: `S:${stubbedGoodItem.id}:E:${stubbedGoodItem.event.id}`,
                                    eventSourceId: stubbedGoodItem.eventSource.id,
                                    disableAlertThreshold: false,
                                },
                                {
                                    pk: `S:${stubbedGoodItem.id}`,
                                    sk: `U:${stubbedGoodItem.user.id}`,
                                    gsi1Sort: `S:${stubbedGoodItem.enabled}:${stubbedGoodItem.id}`,
                                    name: stubbedGoodItem.event.name,
                                    gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                                    gsi2Sort: `S:${stubbedGoodItem.id}:U:${stubbedGoodItem.user.id}`,
                                },
                            ],
                            LastEvaluatedKey: {
                                pk: `S:${stubbedGoodItem.id}`,
                                sk: `U:${stubbedGoodItem.user.id}`,
                            },
                        };
                        return Promise.resolve(r);
                    },
                };
            })
            .mockImplementationOnce(() => {
                return {
                    promise: () => {
                        const r: DocumentClient.QueryOutput = {
                            Items: [
                                {
                                    pk: `S:${stubbedGoodItem.id}`,
                                    sk: `ST:email:someone@somewhere.com`,
                                    address: 'someone@somewhere.com',
                                    gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                                    gsi2Sort: `S:${stubbedGoodItem.id}:ST:email:someone@somewhere.com`,
                                    subscriptionId: 'sub1',
                                    targetType: 'email',
                                },
                                {
                                    pk: `S:${stubbedGoodItem.id}`,
                                    sk: `ST:sms:5555555555`,
                                    phoneNumber: '5555555555',
                                    gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                                    gsi2Sort: `S:${stubbedGoodItem.id}:ST:sms:5555555555`,
                                    subscriptionId: 'sub1',
                                    targetType: 'sms',
                                },
                                {
                                    pk: `S:${stubbedGoodItem.id}`,
                                    sk: `ST:push_gcm:arn%3Aaws%3Asns%3Aus-west-2%3A123456789012%3Aendpoint%2FGCM%2FMyApplication%2F12345678-abcd-9012-efgh-345678901234`,
                                    platformApplicationArn:
                                        'arn:aws:sns:us-west-2:123456789012:app/GCM/MyApplication',
                                    platformEndpointArn:
                                        'arn:aws:sns:us-west-2:123456789012:endpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234',
                                    token: 'EXAMPLE12345',
                                    gsi2Key: `ES:${stubbedGoodItem.eventSource.id}:${stubbedGoodItem.eventSource.principal}:${stubbedGoodItem.principalValue}`,
                                    gsi2Sort: `S:${stubbedGoodItem.id}:ST:push_gcm:arn%3Aaws%3Asns%3Aus-west-2%3A123456789012%3Aendpoint%2FGCM%2FMyApplication%2F12345678-abcd-9012-efgh-345678901234`,
                                    subscriptionId: 'sub1',
                                    targetType: 'push_gcm',
                                },
                            ],
                        };
                        return Promise.resolve(r);
                    },
                };
            }));

        mockedTargetDao.assemble = jest
            .fn()
            .mockReturnValueOnce(email1)
            .mockReturnValueOnce(sms1)
            .mockReturnValueOnce(pushGcm);

        // execute
        const actual = await instance.listSubscriptionsForEventMessage(
            eventSourceId,
            principal,
            principalValue,
        );

        // verify
        expect(mockedQuery).toBeCalledTimes(2);
        expect(actual).toEqual([stubbedGoodItem]);
    });
});

function mockBuildPutItemAttributeMap(
    mockedTargetDao: jest.Mocked<TargetDao>,
    item: SubscriptionItem,
) {
    // mocks
    const response1 = {
        pk: `S:${item.id}`,
        sk: `ST:email:someone@somewhere.com`,
        gsi2Key: `ES:${item.eventSource.id}:${item.eventSource.principal}:${item.principalValue}`,
        gsi2Sort: `S:${item.id}:ST:email:someone@somewhere.com`,
        address: 'someone@somewhere.com',
    };
    const response2 = {
        pk: `S:${item.id}`,
        sk: `ST:sms:5555555555`,
        gsi2Key: `ES:${item.eventSource.id}:${item.eventSource.principal}:${item.principalValue}`,
        gsi2Sort: `S:${item.id}:ST:sms:5555555555`,
        phoneNumber: '5555555555',
    };
    const response3 = {
        pk: `S:${item.id}`,
        sk: `ST:push_gcm:arn%3Aaws%3Asns%3Aus-west-2%3A123456789012%3Aendpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234`,
        gsi2Key: `ES:${item.eventSource.id}:${item.eventSource.principal}:${item.principalValue}`,
        gsi2Sort: `S:${item.id}:ST:push_gcm:arn%3Aaws%3Asns%3Aus-west-2%3A123456789012%3Aendpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234`,
        platformApplicationArn: 'arn:aws:sns:us-west-2:123456789012:app/GCM/MyApplication',
        platformEndpointArn:
            'arn:aws:sns:us-west-2:123456789012:endpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234',
        token: 'EXAMPLE12345',
    };
    mockedTargetDao.buildPutItemAttributeMap = jest
        .fn()
        .mockReturnValueOnce(response1)
        .mockReturnValueOnce(response2)
        .mockReturnValueOnce(response3);
}
