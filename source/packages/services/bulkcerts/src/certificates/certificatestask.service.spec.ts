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
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import { logger } from '../utils/logger';
import { CertificatesTaskService } from './certificatestask.service';
import {CertificateInfo} from './certificatestask.models';
import AWS, { AWSError } from 'aws-sdk';
import { CertificatesTaskDao } from './certificatestask.dao';

describe('CertificatesService', () => {
    let mockedCertificatesTaskDao: jest.Mocked<CertificatesTaskDao>;
    let instance: CertificatesTaskService;
    let mockSNS: AWS.SNS;

    const testChunkSize = 50;
    const testDaysExpiry = 10;

    beforeEach(() => {
        mockSNS = new AWS.SNS();

        const mockSNSFactory = () => {
            return mockSNS;
        };

        mockedCertificatesTaskDao = createMockInstance(CertificatesTaskDao);

        instance = new CertificatesTaskService('unit-test-topic', 'UnitTestCN', 'UnitTestOrg',
                                               'UnitTestOU', 'UnitTestLand', 'Testorado', 'Testville',
                                               'xxxxxxxxx', 'cdf.unit.test', testChunkSize, testDaysExpiry,
                                               mockedCertificatesTaskDao, mockSNSFactory);
    });


    const certInfoSequential:CertificateInfo = {
        'commonName': '`unit-test::`AB1CD79EF1${increment(115)}',
        'organization': 'UnitTestOrg2',
        'organizationalUnit': 'UnitTestOU2',
        'locality': 'UnitTestLand2',
        'stateName': 'Testorado2',
        'country': 'US',
        'emailAddress': 'cdf-test@amazon.com',
        'distinguishedNameQualifier': 'cdf.unit.test'
    };

    const certInfoList = {
        'commonName': '`unit-test::`AB1CD79EF1${list}',
        'commonNameList': ['AB1CD79EF1','AB1CD79EF2','AB1CD79EF3'],
        'organization': 'UnitTestOrg2',
        'organizationalUnit': 'UnitTestOU2',
        'locality': 'UnitTestLand2',
        'stateName': 'Testorado2',
        'country': 'US',
        'emailAddress': 'cdf-test@amazon.com',
        'distinguishedNameQualifier': 'cdf.unit.test'
    };

    const certInfoStatic = {
        'commonName': '`unit-test::`AB1CD79EF1${static}',
        'organization': 'UnitTestOrg2',
        'organizationalUnit': 'UnitTestOU2',
        'locality': 'UnitTestLand2',
        'stateName': 'Testorado2',
        'country': 'US',
        'emailAddress': 'cdf-test@amazon.com',
        'distinguishedNameQualifier': 'cdf.unit.test'
    };

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

        const certInfo = {};

        // call createTask
        const taskId = await instance.createTask(1000, 'unit-test-ca',certInfo);
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

        const certInfo = {};

        // call createTask
        const taskId = await instance.createTask(1015, 'unit-test-ca',certInfo);
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

    it('createTask with sequentially generated CommonNames', async () => {

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
        const taskId = await instance.createTask(115, 'unit-test-ca', certInfoSequential);
        logger.debug(`taskId: ${taskId}`);

        // validation
        const expectedChunks = Math.floor(115/testChunkSize)+1;
        expect(mockPublish).toBeCalledTimes(expectedChunks);
        expect(publishParameters.length).toEqual(expectedChunks);
        for (let i=1; i<=expectedChunks; ++i) {
            const publish = publishParameters[i-1];
            expect(publish.Subject).toEqual('CreateChunk');
            expect(publish.TopicArn).toEqual('unit-test-topic');
            const message = JSON.parse(publish.Message);
            logger.debug(`message: ${JSON.stringify(message)}`);
            expect(message.certInfo.commonName.generator).toEqual('increment');
            expect(message.certInfo.commonName.commonNameStart).toEqual('AB1CD79EF1');
            expect(message.certInfo.commonName.prefix).toEqual('unit-test::');
            expect(message.chunkId).toEqual(i);
            expect(message.quantity).toEqual(i === expectedChunks ? 15 : 50);
        }
    });

    it('createTask with List generated CommonNames', async () => {

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
        const taskId = await instance.createTask(3, 'unit-test-ca', certInfoList);
        logger.debug(`taskId: ${taskId}`);

        // validation
        const expectedChunks = Math.floor(3/testChunkSize)+1;
        expect(mockPublish).toBeCalledTimes(expectedChunks);
        expect(publishParameters.length).toEqual(expectedChunks);
        for (let i=1; i<=expectedChunks; ++i) {
            const publish = publishParameters[i-1];
            expect(publish.Subject).toEqual('CreateChunk');
            expect(publish.TopicArn).toEqual('unit-test-topic');
            const message = JSON.parse(publish.Message);
            expect(message.certInfo.commonName.generator).toEqual('list');
            expect(message.certInfo.commonName.commonNameList).toEqual(['AB1CD79EF1','AB1CD79EF2','AB1CD79EF3']);
            expect(message.certInfo.commonName.prefix).toEqual('unit-test::');
            expect(message.chunkId).toEqual(i);
            expect(message.quantity).toEqual(i === expectedChunks ? 3 : 50);
        }
    });

    it('createTask with Static generated CommonNames', async () => {

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
        const taskId = await instance.createTask(115, 'unit-test-ca', certInfoStatic);
        logger.debug(`taskId: ${taskId}`);

        // validation
        const expectedChunks = Math.floor(115/testChunkSize)+1;
        expect(mockPublish).toBeCalledTimes(expectedChunks);
        expect(publishParameters.length).toEqual(expectedChunks);
        for (let i=1; i<=expectedChunks; ++i) {
            const publish = publishParameters[i-1];
            expect(publish.Subject).toEqual('CreateChunk');
            expect(publish.TopicArn).toEqual('unit-test-topic');
            const message = JSON.parse(publish.Message);
            expect(message.certInfo.commonName.generator).toEqual('static');
            expect(message.certInfo.commonName.commonNameStatic).toEqual('AB1CD79EF1');
            expect(message.certInfo.commonName.prefix).toEqual('unit-test::');
            expect(message.chunkId).toEqual(i);
            expect(message.quantity).toEqual(i === expectedChunks ? 15 : 50);
        }
    });
    
    it('Create Task with invalid country Code', async () => {
        const certInfo = Object.assign({},certInfoSequential);
        certInfo.country = 'fail'
        // call createTask
        try {
            await instance.createTask(115, 'unit-test-ca', certInfo);
            fail(); //expecting error
        } catch (e) {
            expect(e.name).toEqual('ArgumentError');
        }

    });
    
    it('Create Task with invalid commonName, base64 commonname exceeds 64 charchters ', async () => {
        const certInfo = Object.assign({},certInfoSequential);
        certInfo.commonName = '`unit-test::`AB1CD79EFAB1CD79EFABCDEFABCDEFABCDEFABCDEF${static}'
        // call createTask
        try {
            await instance.createTask(115, 'unit-test-ca', certInfo);
            fail(); //expecting error
        } catch (e) {
            expect(e.name).toEqual('ArgumentError');
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
