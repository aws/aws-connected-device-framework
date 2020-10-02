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
import { EmailTargetItem } from '../targets/targets.models';
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
});
