/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import { logger } from '../utils/logger';
import { CertificatesTaskService } from './certificatestask.service';
import AWS, { AWSError } from 'aws-sdk';
import { CertificatesTaskDao } from './certificatestask.dao';

describe('CertificatesService', () => {
    let mockedCertificatesTaskDao: jest.Mocked<CertificatesTaskDao>;
    let instance: CertificatesTaskService;
    let mockSNS: AWS.SNS;

    const testChunkSize = 50;

    beforeEach(() => {
        mockSNS = new AWS.SNS();

        const mockSNSFactory = () => {
            return mockSNS;
        };

        mockedCertificatesTaskDao = createMockInstance(CertificatesTaskDao);

        instance = new CertificatesTaskService('unit-test-topic', 'UnitTestCN', 'UnitTestOrg',
                                               'UnitTestOU', 'UnitTestLand', 'Testorado', 'Testville',
                                               'info@unit.test', 'cdf.unit.test', '1234', 'testid', testChunkSize,
                                               mockedCertificatesTaskDao, mockSNSFactory);
    });

    it('createTask with requested certs equally divisible into chunks', async () => {

        const mockSnsPublishResponse:AWS.SNS.PublishResponse = {
            MessageId: 'unit-test-publish-id'
        };

        const mockPublishResponse = new MockPublishResponse();
        mockPublishResponse.response = mockSnsPublishResponse;
        mockPublishResponse.error = null;
        const publishParameters:AWS.SNS.Types.PublishInput[] = [];

        const mockPublish = mockSNS.publish = <any> jest.fn((params) => {
            publishParameters.push(params);
            return mockPublishResponse;
        });

        // call createTask
        const taskId = await instance.createTask(1000, 'unit-test-ca');
        logger.debug(`taskId: ${taskId}`);

        // validation
        const expectedChunks = 1000/testChunkSize;
        expect(mockPublish).toBeCalledTimes(expectedChunks);
        expect(publishParameters.length).toEqual(expectedChunks);
        for (let i=1; i<=expectedChunks; ++i) {
            const publish = publishParameters[i-1];
            expect(publish.Subject).toEqual('CreateChunk');
            expect(publish.TopicArn).toEqual('unit-test-topic');
            const message = JSON.parse(publish.Message);
            expect(message.chunkId).toEqual(i);
            expect(message.quantity).toEqual(50);
        }
    });

    it('createTask with requested certs not equally divisible into chunks', async () => {

        const mockSnsPublishResponse:AWS.SNS.PublishResponse = {
            MessageId: 'unit-test-publish-id'
        };

        const mockPublishResponse = new MockPublishResponse();
        mockPublishResponse.response = mockSnsPublishResponse;
        mockPublishResponse.error = null;
        const publishParameters:AWS.SNS.Types.PublishInput[] = [];

        const mockPublish = mockSNS.publish = <any> jest.fn((params) => {
            publishParameters.push(params);
            return mockPublishResponse;
        });

        // call createTask
        const taskId = await instance.createTask(1015, 'unit-test-ca');
        logger.debug(`taskId: ${taskId}`);

        // validation
        const expectedChunks = Math.floor(1015/testChunkSize)+1;
        expect(mockPublish).toBeCalledTimes(expectedChunks);
        expect(publishParameters.length).toEqual(expectedChunks);
        for (let i=1; i<=expectedChunks; ++i) {
            const publish = publishParameters[i-1];
            expect(publish.Subject).toEqual('CreateChunk');
            expect(publish.TopicArn).toEqual('unit-test-topic');
            const message = JSON.parse(publish.Message);
            expect(message.chunkId).toEqual(i);
            expect(message.quantity).toEqual(i === expectedChunks ? 15 : 50);
        }
    });
});

class MockPublishResponse {
    public response: AWS.SNS.Types.PublishResponse;
    public error: AWSError;

    promise(): Promise<AWS.SNS.Types.PublishResponse> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
