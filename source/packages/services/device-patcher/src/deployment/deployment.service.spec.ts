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

import {DeploymentService} from './deployment.service';
import {DeploymentDao} from './deployment.dao';
import {DeploymentManager} from './deployment.manager';
import {createMockInstance} from 'jest-create-mock-instance';
import {DeploymentStatus, DeploymentType} from './deployment.model';

describe('DeploymentService', () => {

    let mockedDeploymentDao: jest.Mocked<DeploymentDao>;
    let mockedDeploymentManager: jest.Mocked<DeploymentManager>;
    let instance: DeploymentService;

    beforeEach(() => {
        mockedDeploymentDao = createMockInstance(DeploymentDao);
        mockedDeploymentManager = createMockInstance(DeploymentManager);

        instance = new DeploymentService(mockedDeploymentDao, mockedDeploymentManager);
    });


    it('should create a deployment', async () => {
    
        const deployments = [{
            'deploymentTemplateName': '<some-template-name>',
            'deviceId': '<some-device-id>',
            'deploymentType': DeploymentType.AGENTBASED,
            'extraVars': {
                "key1": "val1",
                "key2": "val2"
            }
        },{
            'deploymentTemplateName': '<some-template-name>',
            'deviceId': '<some-device-id>',
            'deploymentType': DeploymentType.AGENTBASED,
            'extraVars': {
                "key1": "val1",
                "key2": "val2"
            }
        }];

        const mockCreateDeployment = mockedDeploymentManager.create =
            jest.fn().mockReturnValueOnce(undefined);
    
        const mockSaveDeployment = mockedDeploymentDao.saveBatches =
            jest.fn().mockReturnValueOnce(undefined);

        await instance.createBulk(deployments);

        expect(mockCreateDeployment.mock.calls.length).toBe(2);
        expect(mockSaveDeployment.mock.calls.length).toBe(1);
    
    });

    it('should deploy a deployment', async () => {
        const deployment = {
            'deploymentTemplateName': '<some-template-name>',
            'deploymentType': DeploymentType.AGENTBASED,
            'deviceId': '<some-device-id>',
            'deploymentId': '<some-deployment-id>'
        };

        const mockUpdateDeployment = mockedDeploymentDao.update =
            jest.fn().mockReturnValueOnce(undefined);

        const mockDeployDeployment = mockedDeploymentManager.deploy =
            jest.fn().mockReturnValueOnce(undefined);

        const response = await instance.deploy(deployment);

        expect(response).toBeUndefined();

        expect(mockUpdateDeployment.mock.calls.length).toBe(1);
        expect(mockDeployDeployment.mock.calls.length).toBe(1);

    });

    it('should get a deployment', async () => {
        const deploymentId = '<some-deployment-id>';
        const mockedGetDeploymentResponse = {
            'deviceId': 'my-test-core-id',
            'deploymentId': '<some-deployment-id>',
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'deploymentTemplateName': 'my-template',
            'deploymentStatus': 'success',
            'deploymentType': 'agentbased'
        }

        const mockGetDeployment = mockedDeploymentDao.get =
            jest.fn().mockReturnValueOnce(mockedGetDeploymentResponse);

        const response = await instance.get(deploymentId);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('deviceId');
        expect(response).toHaveProperty('deploymentId');
        expect(response).toHaveProperty('createdAt');
        expect(response).toHaveProperty('updatedAt');
        expect(response).toHaveProperty('deploymentTemplateName');
        expect(response).toHaveProperty('deploymentStatus');
        expect(response).toHaveProperty('deploymentType');

        expect(mockGetDeployment.mock.calls.length).toBe(1);

    });

    it('should list a deployments', async () => {
        const deviceId = '<some-device-id>';
        const mockedlistDeploymentResponse =[
            [{
                'deviceId': 'my-test-core-id',
                'deploymentId': '<some-deployment-id>',
                'createdAt': '<some-date>',
                'updatedAt': '<some-date>',
                'deploymentTemplateName': 'my-template',
                'deploymentStatus': 'success',
                'deploymentType': 'agentbased'
            },{
                'deviceId': 'my-test-core-id',
                'deploymentId': '<some-deployment-id>',
                'createdAt': '<some-date>',
                'updatedAt': '<some-date>',
                'deploymentTemplateName': 'my-template',
                'deploymentStatus': 'failed',
                'deploymentType': 'agentbased'
            }]
        ]


        const mockListDeployment = mockedDeploymentDao.list =
            jest.fn().mockReturnValueOnce(mockedlistDeploymentResponse);

        const response = await instance.listDeploymentsByDeviceId(deviceId);

        expect(response).toBeDefined();
        expect(response[0].length).toEqual(2);
        expect(mockListDeployment.mock.calls.length).toBe(1);

    });

    it('should delete a deployment', async () => {
        const deploymentId = '<some-deployment-id>';

        const mockedGetDeploymentResponse = {
            'deviceId': 'my-test-core-id',
            'deploymentId': '<some-deployment-id>',
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'deploymentTemplateName': 'my-template',
            'deploymentStatus': 'success',
            'deploymentType': 'agentbased'
        }

        const mockGetDeployment = mockedDeploymentDao.get =
            jest.fn().mockReturnValueOnce(mockedGetDeploymentResponse);

        const mockDeleteDeploymentDao = mockedDeploymentDao.delete =
            jest.fn().mockReturnValueOnce(undefined);

        const mockDeleteDeploymentManager = mockedDeploymentManager.delete =
            jest.fn().mockReturnValueOnce(undefined);

        const response = await instance.delete(deploymentId);

        expect(response).toBeUndefined();
        expect(mockDeleteDeploymentDao.mock.calls.length).toBe(1);
        expect(mockDeleteDeploymentManager.mock.calls.length).toBe(1);
        expect(mockGetDeployment.mock.calls.length).toBe(1);

    });

    it('should update a deployment', async () => {
        const deployment = {
            'deviceId': 'my-test-core-id',
            'deploymentId': '<some-deployment-id>',
            'deploymentTemplateName': 'my-template',
        }
        const mockedGetDeploymentResponse = {
            'deviceId': 'my-test-core-id',
            'deploymentId': '<some-deployment-id>',
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'deploymentTemplateName': 'my-template',
            'deploymentStatus': 'success',
            'deploymentType': 'agentbased'
        }

        const mockGetDeployment = mockedDeploymentDao.get =
            jest.fn().mockReturnValueOnce(mockedGetDeploymentResponse);

        const mockUpdateDeployment = mockedDeploymentDao.update =
            jest.fn().mockReturnValueOnce(undefined);

        const response = await instance.update(deployment);

        expect(response).toBeUndefined();
        expect(mockUpdateDeployment.mock.calls.length).toBe(1);
        expect(mockGetDeployment.mock.calls.length).toBe(1);

    });

    it('should retry a deployment', async () => {
        const deploymentId = '<some-deployment-id>';
        const deployment = {
            'deviceId': 'my-test-core-id',
            'deploymentTemplateName': 'my-template',
            'deploymentStatus': DeploymentStatus.RETRY
        }

        const mockedGetDeploymentResponse = {
            'deviceId': 'my-test-core-id',
            'deploymentId': '<some-deployment-id>',
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'deploymentTemplateName': 'my-template',
            'deploymentStatus': 'success',
            'deploymentType': 'agentbased'
        }

        const mockGetDeployment = mockedDeploymentDao.get =
            jest.fn().mockReturnValueOnce(mockedGetDeploymentResponse);


        const mockUpdateDeploymentManager = mockedDeploymentManager.update =
            jest.fn().mockReturnValueOnce(undefined);


        const response = await instance.retry(deploymentId, deployment);

        expect(response).toBeUndefined();
        expect(mockUpdateDeploymentManager.mock.calls.length).toBe(1);
        expect(mockGetDeployment.mock.calls.length).toBe(1);

    });
})
