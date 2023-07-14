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
import AWS, { AWSError } from 'aws-sdk';
import { createMockInstance } from 'jest-create-mock-instance';
import 'reflect-metadata';

import { ActivationDao } from './activation.dao';
import { ActivationItem } from './activation.model';
import { ActivationService } from './activation.service';

describe('ActivationService', () => {
    let mockedActivationDao: jest.Mocked<ActivationDao>;
    let mockedSSM: AWS.SSM;
    let instance: ActivationService;

    beforeEach(() => {
        mockedSSM = new AWS.SSM();
        const mockedSSMFactory = () => {
            return mockedSSM;
        };

        mockedActivationDao = createMockInstance(ActivationDao);
        instance = new ActivationService(mockedSSMFactory, mockedActivationDao);
    });

    it('should create an activation', async () => {
        const activationRequest: ActivationItem = {
            deviceId: 'test-core-001',
        };

        const mockedSSMCreateActivationResponse =
            new MockAWSPromise<AWS.SSM.Types.CreateActivationResult>();
        mockedSSMCreateActivationResponse.response = {
            ActivationId: '<some-activation-id>',
            ActivationCode: '<some-activation-code>',
        };

        const mockSSMCreateActivation = (mockedSSM.createActivation = <any>(
            jest.fn().mockReturnValueOnce(mockedSSMCreateActivationResponse)
        ));

        const response = await instance.createActivation(activationRequest);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('activationId');
        expect(response).toHaveProperty('activationCode');
        expect(response).toHaveProperty('activationRegion');
        expect(response.activationId).toEqual('<some-activation-id>');
        expect(response.activationCode).toEqual('<some-activation-code>');
        expect(mockSSMCreateActivation.mock.calls.length).toBe(1);
    });

    it('should get an activation', async () => {
        const activationId: string = 'activation-001';

        const mockedActivationResponse = {
            deviceId: 'test-core-001',
            activationId: activationId,
            createdAt: '<some-date>',
            updatedAt: '<some-date>',
        };

        const mockGetByDeviceId = (mockedActivationDao.get = jest
            .fn()
            .mockReturnValueOnce(mockedActivationResponse));

        const response = await instance.getActivation(activationId);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('deviceId');
        expect(response).toHaveProperty('createdAt');
        expect(response).toHaveProperty('updatedAt');
        expect(response.deviceId).toEqual('test-core-001');
        expect(response.activationId).toEqual(activationId);
        expect(response.updatedAt).toEqual('<some-date>');
        expect(response.createdAt).toEqual('<some-date>');

        expect(mockGetByDeviceId.mock.calls.length).toBe(1);
    });

    it('should delete an activation', async () => {
        const activationId: string = 'a1b2c3d4-a1bc-1a23-a1b2-abcd1234ef56';

        const mockedSSMDeleteActivationResponse =
            new MockAWSPromise<AWS.SSM.Types.CreateActivationResult>();
        mockedSSMDeleteActivationResponse.response = {};

        const mockSSMDeleteActivation = (mockedSSM.deleteActivation = <any>(
            jest.fn().mockReturnValueOnce(mockedSSMDeleteActivationResponse)
        ));

        const mockDelete = (mockedActivationDao.delete = jest.fn().mockReturnValueOnce({}));

        const response = await instance.deleteActivation(activationId);

        expect(response).toBeUndefined();
        expect(mockSSMDeleteActivation.mock.calls.length).toBe(1);
        expect(mockDelete.mock.calls.length).toBe(1);
    });

    it('should update an activation', async () => {
        const activation = {
            deviceId: 'test-core-001',
            activationId: '<some-activation-id>',
        };

        const mockedUpdateResponse = {};

        const mockUpdate = (mockedActivationDao.update = jest
            .fn()
            .mockReturnValueOnce(mockedUpdateResponse));

        const response = await instance.updateActivation(activation);

        expect(response).toBeUndefined();
        expect(mockUpdate.mock.calls.length).toBe(1);
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
