/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import AWS, { AWSError } from 'aws-sdk';
import { createMockInstance } from 'jest-create-mock-instance';

import {ActivationService} from './activation.service';
import {ActivationDao} from './activation.dao';
import {ActivationItem} from './activation.model';
import {IotUtil} from '../utils/iot.util';

describe('ActivationService', () => {

    let mockedActivationDao: jest.Mocked<ActivationDao>
    let mockedIotUtil: jest.Mocked<IotUtil>
    let mockedSSM: AWS.SSM;
    let instance: ActivationService;

    beforeEach(() => {
        mockedSSM = new AWS.SSM();
        const mockedSSMFactory = () => {
            return mockedSSM;
        };

        mockedIotUtil = createMockInstance(IotUtil);
        mockedActivationDao = createMockInstance(ActivationDao)
        instance = new ActivationService(mockedSSMFactory, mockedIotUtil, mockedActivationDao)
    });

    it('should create an activation', async () => {

        const activationRequest: ActivationItem = {
            'deviceId': 'test-core-001'
        };
        const mockedDeviceExistsInRegistryResponse = true

        const mockedSSMCreateActivationResponse = new MockAWSPromise<AWS.SSM.Types.CreateActivationResult>();
        mockedSSMCreateActivationResponse.response = {
            ActivationId: '<some-activation-id>',
            ActivationCode: '<some-activation-code>'
        };

        const mockSSMCreateActivation = mockedSSM.createActivation =
            <any> jest.fn().mockReturnValueOnce(mockedSSMCreateActivationResponse);

        const mockDeviceExistsInRegistry = mockedIotUtil.deviceExistsInRegistry =
            jest.fn().mockReturnValueOnce(mockedDeviceExistsInRegistryResponse);

        const response = await instance.createActivation(activationRequest);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('activationId');
        expect(response).toHaveProperty('activationCode');
        expect(response).toHaveProperty('activationRegion');
        expect(response.activationId).toEqual('<some-activation-id>');
        expect(response.activationCode).toEqual('<some-activation-code>');
        expect(mockSSMCreateActivation.mock.calls.length).toBe(1);
        expect(mockDeviceExistsInRegistry.mock.calls.length).toBe(1);

    });

    it('should get an activation', async () => {
        const deviceId:string = 'test-core-001';
        const activationId:string = 'activation-001';

        const mockedGetByDeviceIdResponse = {
            deviceId: 'test-core-001',
            activationId: '<some-activation-id>',
            createdAt: '<some-date>',
            updatedAt: '<some-date>',
        }

        const mockGetByDeviceId = mockedActivationDao.getByDeviceId =
            jest.fn().mockReturnValueOnce(mockedGetByDeviceIdResponse);

        const response = await instance.getActivation(activationId, deviceId);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('deviceId');
        expect(response).toHaveProperty('createdAt');
        expect(response).toHaveProperty('updatedAt');
        expect(response.deviceId).toEqual('test-core-001');
        expect(response.activationId).toEqual('<some-activation-id>');
        expect(response.updatedAt).toEqual('<some-date>');
        expect(response.createdAt).toEqual('<some-date>');

        expect(mockGetByDeviceId.mock.calls.length).toBe(1);
    });

    it('should delete an activation', async () => {
        const deviceId:string = 'test-core-001';
        const activationId:string = 'activation-001';


        const mockedSSMDeleteActivationResponse = new MockAWSPromise<AWS.SSM.Types.CreateActivationResult>();
        mockedSSMDeleteActivationResponse.response = {};

        const mockSSMDeleteActivation = mockedSSM.deleteActivation =
            <any> jest.fn().mockReturnValueOnce(mockedSSMDeleteActivationResponse);


        const mockDelete = mockedActivationDao.delete =
            jest.fn().mockReturnValueOnce({});

        const response = await instance.deleteActivation(activationId, deviceId);

        expect(response).toBeUndefined();
        expect(mockSSMDeleteActivation.mock.calls.length).toBe(1)
        expect(mockDelete.mock.calls.length).toBe(1)

    });

    it('should update an activation', async () => {
        const activation = {
            'deviceId': 'test-core-001',
            'activationId': '<some-activation-id>'
        };

        const mockedUpdateResponse = {};

        const mockUpdate = mockedActivationDao.update =
            jest.fn().mockReturnValueOnce(mockedUpdateResponse);

        const response = await instance.updateActivation(activation);

        expect(response).toBeUndefined();
        expect(mockUpdate.mock.calls.length).toBe(1)
    });

});

class MockAWSPromise<T> {
    public response: T;
    public error: AWSError = null;

    promise(): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
