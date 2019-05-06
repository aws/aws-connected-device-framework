/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import { logger } from '../utils/logger';
import { CertificatesTaskService } from './certificatestask.service';
import AWS from 'aws-sdk';
import { CertificatesTaskDao } from './certificatestask.dao';

describe('CertificatesService', () => {
    let mockedCertificatesTaskDao: jest.Mocked<CertificatesTaskDao>;
    let instance: CertificatesTaskService;

    let mockSNS: AWS.SNS;
    const testChunkSize = 50;

    beforeEach(() => {
        mockedCertificatesTaskDao = createMockInstance(CertificatesTaskDao);
        mockSNS = new AWS.SNS();
        instance = new CertificatesTaskService('unit-test-topic', 'UnitTestCN', 'UnitTestOrg',
                                               'UnitTestOU', 'UnitTestLand', 'Testorado', 'Testville',
                                               'info@unit.test', 'cdf.unit.test', '1234', 'testid', testChunkSize,
                                               mockedCertificatesTaskDao, () => mockSNS);
    });

    it('createTask with requested certs equally divisible into chunks', async () => {

        const mockSnsPublishResponse= {
            MessageId: 'unit-test-publish-id'
        };

        mockSNS.publish = jest.fn().mockImplementation(()=> {
            return {
                promise: ():AWS.SNS.Types.PublishResponse => mockSnsPublishResponse
            };
        });

        await instance.createTask(1000, 'unit-test-ca');
        const expectedChunks = 1000/testChunkSize;
        expect((<jest.Mock>mockSNS.publish).mock.calls.length).toEqual(expectedChunks);

        for (let i=1; i<=expectedChunks; ++i) {
            const publishParams = <AWS.SNS.Types.PublishInput> (<jest.Mock>mockSNS.publish).mock.calls[i-1][0];
            expect(publishParams.Subject).toEqual('CreateChunk');
            expect(publishParams.TopicArn).toEqual('unit-test-topic');
            const message = JSON.parse(publishParams.Message);
            expect(message.chunkId).toEqual(i);
            expect(message.quantity).toEqual(50);
        }
    });

    it('createTask with requested certs not equally divisible into chunks', async () => {

        const mockSnsPublishResponse= {
            MessageId: 'unit-test-publish-id'
        };

        mockSNS.publish = jest.fn().mockImplementation(()=> {
            return {
            promise: ():AWS.SNS.Types.PublishResponse => mockSnsPublishResponse
            };
        });

        const taskId = await instance.createTask(1015, 'unit-test-ca');
        logger.debug(`taskId: ${taskId}`);
        const expectedChunks = Math.floor(1015/testChunkSize)+1;
        expect((<jest.Mock>mockSNS.publish).mock.calls.length).toEqual(expectedChunks);
        for (let i=1; i<=expectedChunks; ++i) {
            const publishParams = <AWS.SNS.Types.PublishInput> (<jest.Mock>mockSNS.publish).mock.calls[i-1][0];
            expect(publishParams.Subject).toEqual('CreateChunk');
            expect(publishParams.TopicArn).toEqual('unit-test-topic');
            const message = JSON.parse(publishParams.Message);
            expect(message.chunkId).toEqual(i);
            expect(message.quantity).toEqual(i === expectedChunks ? 15 : 50);
        }
    });
});
