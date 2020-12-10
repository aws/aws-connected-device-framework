 /*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { SubscriptionDao } from './subscription.dao';
import { SubscriptionItem } from './subscription.models';
import { createMockInstance } from 'jest-create-mock-instance';
import { EventDao } from '../events/event.dao';
import { SubscriptionAssembler } from './subscription.assembler';
import { SNSTarget } from '../targets/processors/sns.target';
import { TargetService } from '../targets/target.service';
import { SubscriptionService } from './subscription.service';
import { DynamodDBTargetItem, EmailTargetItem, PushTargetItem, TargetTypeStrings } from '../targets/targets.models';
import { ListSubscriptionsResponse } from 'aws-sdk/clients/sns';

describe('SubscriptionService', () => {

    let mockedSubscriptionDao: jest.Mocked<SubscriptionDao>;
    let mockedEventDao: jest.Mocked<EventDao>;
    let mockedSubscriptionAssembler: jest.Mocked<SubscriptionAssembler>;
    let mockedTargetService: jest.Mocked<TargetService>;
    let mockedSNSTarget: jest.Mocked<SNSTarget>;
    let instance: SubscriptionService;

    beforeEach(() => {
        mockedSubscriptionDao = createMockInstance(SubscriptionDao);
        mockedEventDao = createMockInstance(EventDao);
        mockedSubscriptionAssembler = createMockInstance(SubscriptionAssembler);
        mockedTargetService = createMockInstance(TargetService);
        mockedSNSTarget = createMockInstance(SNSTarget);

        instance = new SubscriptionService(mockedSubscriptionDao, mockedEventDao, mockedSubscriptionAssembler, mockedTargetService, mockedSNSTarget);
    });

    it('get happy path', async() => {

        // stubs
        const subscriptionId = 'sub001';
        const email = new EmailTargetItem();
        email.subscriptionArn = 'sub-arn-1';
        const stubbedItem:SubscriptionItem = {
            id: subscriptionId,
            targets: {
                email: [email],
            }
        };

        // mocks
        const mockedDaoGet = mockedSubscriptionDao.get = jest.fn().mockReturnValue(stubbedItem);
        const mockedSnsList = mockedSNSTarget.listSubscriptions = jest.fn().mockReturnValue(undefined);
        const mockedTargetDelete = mockedTargetService.delete = jest.fn().mockReturnValue(undefined);
        const mockedTargetUpdate = mockedTargetService.update = jest.fn().mockReturnValue(undefined);

        // execute
        const actual = await instance.get(subscriptionId);

        // verification
        expect(mockedDaoGet).toBeCalledWith(subscriptionId);
        expect(mockedSnsList).toBeCalledTimes(0);
        expect(mockedTargetDelete).toBeCalledTimes(0);
        expect(mockedTargetUpdate).toBeCalledTimes(0);
        expect(actual).toEqual(stubbedItem);

    });

    it('get with PendingConfirmation still pending', async() => {

        // stubs
        const subscriptionId = 'sub001';
        const email = new EmailTargetItem();
        email.address = 'someone@somewhere.com';
        email.subscriptionArn = 'PendingConfirmation';
        const stubbedItem:SubscriptionItem = {
            id: subscriptionId,
            targets: {
                email: [email],
            },
            sns: {
                topicArn: 'topic-arn'
            }
        };

        // mocks
        const mockedDaoGet = mockedSubscriptionDao.get = jest.fn().mockReturnValue(stubbedItem);
        mockedSNSTarget.isPendingConfirmation = jest.fn().mockReturnValue(true);
        const snsListResponse:ListSubscriptionsResponse = {
            Subscriptions: [{
                Endpoint: 'someone@somewhere.com',
                SubscriptionArn: 'PendingConfirmation'
            }]
        };
        const mockedSnsList = mockedSNSTarget.listSubscriptions = jest.fn().mockReturnValueOnce(snsListResponse);
        const mockedTargetUpdate = mockedTargetService.update = jest.fn().mockReturnValue(undefined);

        // execute
        const actual = await instance.get(subscriptionId);

        // verification
        expect(mockedDaoGet).toBeCalledWith(subscriptionId);
        expect(mockedSnsList).toBeCalledWith('topic-arn');
        expect(mockedSnsList).toBeCalledTimes(1);
        expect(mockedTargetUpdate).toBeCalledTimes(0);
        expect(actual).toEqual(stubbedItem);

    });

    it('get with PendingConfirmation is confirmed', async() => {

        // stubs
        const subscriptionId = 'sub001';
        const email = new EmailTargetItem();
        email.address = 'someone@somewhere.com';
        email.subscriptionArn = 'PendingConfirmation';
        const stubbedItem:SubscriptionItem = {
            id: subscriptionId,
            targets: {
                email: [email],
            },
            sns: {
                topicArn: 'topic-arn'
            }
        };

        // mocks
        const mockedDaoGet = mockedSubscriptionDao.get = jest.fn().mockReturnValue(stubbedItem);
        mockedSNSTarget.isPendingConfirmation = jest.fn().mockReturnValue(true);
        const snsListResponse:ListSubscriptionsResponse = {
            Subscriptions: [{
                Endpoint: 'someone@somewhere.com',
                SubscriptionArn: 'sub-arn-1'
            }]
        };
        const mockedSnsList = mockedSNSTarget.listSubscriptions = jest.fn().mockReturnValueOnce(snsListResponse);
        const mockedTargetUpdate = mockedTargetService.update = jest.fn().mockReturnValue(undefined);

        // execute
        const actual = await instance.get(subscriptionId);

        // verification
        expect(mockedDaoGet).toBeCalledWith(subscriptionId);
        expect(mockedSnsList).toBeCalledWith('topic-arn');
        expect(mockedSnsList).toBeCalledTimes(1);
        expect(mockedTargetUpdate).toBeCalledTimes(1);
        expect(mockedTargetUpdate).toBeCalledWith({
            targetType: 'email',
            address: 'someone@somewhere.com',
            subscriptionArn: 'sub-arn-1'
        });

        const expected:SubscriptionItem = Object.assign({}, stubbedItem);
        expected.targets
        .email[0].subscriptionArn = 'sub-arn-1';
        expect(actual).toEqual(expected);

    });

    it('get with PendingConfirmation has expired', async() => {

        // stubs
        const subscriptionId = 'sub001';
        const email = new EmailTargetItem();
        email.address = 'someone@somewhere.com';
        email.subscriptionArn = 'PendingConfirmation';
        const stubbedItem:SubscriptionItem = {
            id: subscriptionId,
            targets: {
                email: [email],
            },
            sns: {
                topicArn: 'topic-arn'
            }
        };

        // mocks
        const mockedDaoGet = mockedSubscriptionDao.get = jest.fn().mockReturnValue(stubbedItem);
        mockedSNSTarget.isPendingConfirmation = jest.fn().mockReturnValue(true);
        const snsListResponse:ListSubscriptionsResponse = {
            Subscriptions: []
        };
        const mockedSnsList = mockedSNSTarget.listSubscriptions = jest.fn().mockReturnValueOnce(snsListResponse);
        const mockedTargetUpdate = mockedTargetService.update = jest.fn().mockReturnValue(undefined);

        // execute
        const actual = await instance.get(subscriptionId);

        // verification
        expect(mockedDaoGet).toBeCalledWith(subscriptionId);
        expect(mockedSnsList).toBeCalledWith('topic-arn');
        expect(mockedSnsList).toBeCalledTimes(1);
        expect(mockedTargetUpdate).toBeCalledTimes(0);

        const expected:SubscriptionItem = Object.assign({}, stubbedItem);
        delete expected.targets.email[0];
        expect(actual).toEqual(expected);

    });

    it('list target arns happy path', async() => {

        // input
        const userId = 'user001';
        const excludeSubscriptionId = 'sub001';

        // stubs
        const stubbedSubscriptionItems = [stubSubscriptionItem1(),stubSubscriptionItem2(),stubSubscriptionItem3()];

        // mocks
        instance.listByUser = jest.fn().mockReturnValue(stubbedSubscriptionItems);

        // execute
        const actual = await instance.listSnsTargetArns(userId, excludeSubscriptionId);

        // verification
        expect(instance.listByUser).toBeCalledWith(userId);
        expect(actual.size).toEqual(3);
        expect(actual.has('email-arn-2')).toEqual(true);
        expect(actual.has('push-arn-2')).toEqual(true);
        expect(actual.has('push-arn-3')).toEqual(true);

    });

    it('safe delete target with non-reused target cleans up target', async() => {

        // input
        const subscriptionId = 'sub002';
        const targetType:TargetTypeStrings = 'email';
        const targetId = 'email2@somewhere.com';

        // stubs
        const stubbedSubscriptionItem2 = stubSubscriptionItem2();   // SubscriptionItem for sub002
        const targetArns = new Set(['PendingConfirmation','push-arn-1','push-arn-2','push-arn-3']);  // targets of sub001 & sub003

        // mocks
        instance.get = jest.fn().mockReturnValueOnce(stubbedSubscriptionItem2);
        instance.listSnsTargetArns = jest.fn().mockReturnValueOnce(targetArns);
        mockedTargetService.delete = jest.fn().mockReturnValue(undefined);

        // execute
        await instance.safeDeleteTarget(subscriptionId, targetType, targetId);

        // verification
        expect(instance.get).toBeCalledWith(subscriptionId);
        expect(instance.listSnsTargetArns).toBeCalledWith(stubbedSubscriptionItem2.user.id, subscriptionId);
        expect(mockedTargetService.delete).toBeCalledTimes(1);
        expect(mockedTargetService.delete).toBeCalledWith(subscriptionId, targetType, targetId, true);

    });

    it('safe delete target with reused target does not clean up target', async() => {

        // input
        const subscriptionId = 'sub002';
        const targetType:TargetTypeStrings = 'push_adm';
        const targetId = 'platform-arn-2';

        // stubs
        const stubbedSubscriptionItem2 = stubSubscriptionItem2();   // SubscriptionItem for sub002
        const targetArns = new Set(['PendingConfirmation','push-arn-1','push-arn-2','push-arn-3']);  // targets of sub001 & sub003

        // mocks
        instance.get = jest.fn().mockReturnValueOnce(stubbedSubscriptionItem2);
        instance.listSnsTargetArns = jest.fn().mockReturnValueOnce(targetArns);
        mockedTargetService.delete = jest.fn().mockReturnValue(undefined);

        // execute
        await instance.safeDeleteTarget(subscriptionId, targetType, targetId);

        // verification
        expect(instance.get).toBeCalledWith(subscriptionId);
        expect(instance.listSnsTargetArns).toBeCalledWith(stubbedSubscriptionItem2.user.id, subscriptionId);
        expect(mockedTargetService.delete).toBeCalledTimes(1);
        expect(mockedTargetService.delete).toBeCalledWith(subscriptionId, targetType, targetId, false);

    });
});

function stubSubscriptionItem1() : SubscriptionItem {
    const email1 = new EmailTargetItem();
    email1.address = 'email1@somewhere.com';
    email1.subscriptionArn = 'PendingConfirmation';

    const pushAdm1 = new PushTargetItem();
    pushAdm1.targetType = 'push_adm';
    pushAdm1.subscriptionArn = 'push-arn-1';
    pushAdm1.platformEndpointArn = 'platform-arn-1';

    const stubbedSubscriptionItem1:SubscriptionItem = {
        id: 'sub001',
        user: {
            id: 'user001'
        },
        targets: {
            email: [email1],
            push_adm: [pushAdm1]
        },
        sns: {
            topicArn: 'topic-arn'
        }
    };

    return stubbedSubscriptionItem1;
}

function stubSubscriptionItem2() : SubscriptionItem {
    const email2 = new EmailTargetItem();
    email2.address = 'email2@somewhere.com';
    email2.subscriptionArn = 'email-arn-2';

    const pushAdm2 = new PushTargetItem();
    pushAdm2.targetType = 'push_adm';
    pushAdm2.subscriptionArn = 'push-arn-2';
    pushAdm2.platformEndpointArn = 'platform-arn-2';

    const ddb1 = new DynamodDBTargetItem();
    ddb1.tableName = 'table-1';

    const stubbedSubscriptionItem:SubscriptionItem = {
        id: 'sub002',
        user: {
            id: 'user001'
        },
        targets: {
            email: [email2],
            push_adm: [pushAdm2],
            dynamodb: [ddb1]
        },
        sns: {
            topicArn: 'topic-arn'
        }
    };

    return stubbedSubscriptionItem;
}

function stubSubscriptionItem3() : SubscriptionItem {
    const pushAdm2 = new PushTargetItem();
    pushAdm2.targetType = 'push_adm';
    pushAdm2.subscriptionArn = 'push-arn-2';
    pushAdm2.platformEndpointArn = 'platform-arn-2';

    const pushAdm3 = new PushTargetItem();
    pushAdm3.targetType = 'push_adm';
    pushAdm3.subscriptionArn = 'push-arn-3';
    pushAdm3.platformEndpointArn = 'platform-arn-3';

    const stubbedSubscriptionItem:SubscriptionItem = {
        id: 'sub003',
        user: {
            id: 'user001'
        },
        targets: {
            push_adm: [pushAdm2, pushAdm3]
        },
        sns: {
            topicArn: 'topic-arn'
        }
    };
    return stubbedSubscriptionItem;
}
