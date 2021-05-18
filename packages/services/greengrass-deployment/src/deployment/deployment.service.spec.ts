/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';

import {DeploymentService} from './deployment.service';
import {DeploymentDao} from './deployment.dao';
import {DeploymentTemplatesDao} from '../templates/template.dao';
import {DeploymentManager} from './deployment.manager';
import {createMockInstance} from 'jest-create-mock-instance';
import {DeploymentStatus} from './deployment.model';
import {IotUtil} from '../utils/iot.util';

describe('DeploymentService', () => {

    let mockedDeploymentDao: jest.Mocked<DeploymentDao>;
    let mockedDeploymentManager: jest.Mocked<DeploymentManager>;
    let mockedTemplatesDao: jest.Mocked<DeploymentTemplatesDao>;
    let mockedIotUtil: jest.Mocked<IotUtil>;
    let instance: DeploymentService;

    beforeEach(() => {
        mockedDeploymentDao = createMockInstance(DeploymentDao);
        mockedDeploymentManager = createMockInstance(DeploymentManager);
        mockedTemplatesDao = createMockInstance(DeploymentTemplatesDao);
        mockedIotUtil = createMockInstance(IotUtil);

        instance = new DeploymentService(mockedIotUtil, mockedDeploymentDao, mockedDeploymentManager, mockedTemplatesDao);
    });


    it('should create a deployment', async () => {

        const deployment = {
            'deploymentTemplateName': '<some-template-name>',
            'deviceId': '<some-device-id>'
        };
        const mockedDeviceExistsInRegistryResponse = true;
        const mockedGetTemplateResponse = {
            'name': '<template_name>',
            'source': {
                'type': 's3',
                'bucket': '<some-bucket>',
                'prefix': '<some-prefix>'
            },
            'type': 'agentbased',
            'versionNo': 1,
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'enabled': true,
            'description': '<some-description>'
        };

        const mockDeviceExistsInRegistry = mockedIotUtil.deviceExistsInRegistry =
            jest.fn().mockReturnValueOnce(mockedDeviceExistsInRegistryResponse);

        const mockSaveDeployment = mockedDeploymentDao.save =
            jest.fn().mockReturnValueOnce(undefined);

        const mockGetTemplate = mockedTemplatesDao.get =
            jest.fn().mockReturnValueOnce(mockedGetTemplateResponse);

        const mockCreateDeployment = mockedDeploymentManager.create =
            jest.fn().mockReturnValueOnce(undefined);


        const response = await instance.create(deployment);

        expect(response).toBeDefined();
        expect(mockDeviceExistsInRegistry.mock.calls.length).toBe(1);
        expect(mockSaveDeployment.mock.calls.length).toBe(1);
        expect(mockGetTemplate.mock.calls.length).toBe(1);
        expect(mockCreateDeployment.mock.calls.length).toBe(1);

    });

    it('should deploy a deployment', async () => {
        const deployment = {
            'deploymentTemplateName': '<some-template-name>',
            'deviceId': '<some-device-id>',
            'deploymentId': '<some-deployment-id>'
        };
        const mockedGetTemplateResponse = {
            'name': '<template_name>',
            'source': {
                'type': 's3',
                'bucket': '<some-bucket>',
                'prefix': '<some-prefix>'
            },
            'type': 'agentbased',
            'versionNo': 1,
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'enabled': true,
            'description': '<some-description>'
        };

        const mockGetTemplate = mockedTemplatesDao.get =
            jest.fn().mockReturnValueOnce(mockedGetTemplateResponse);

        const mockUpdateDeployment = mockedDeploymentDao.update =
            jest.fn().mockReturnValueOnce(undefined);

        const mockDeployDeployment = mockedDeploymentManager.deploy =
            jest.fn().mockReturnValueOnce(undefined);

        const response = await instance.deploy(deployment);

        expect(response).toBeUndefined();

        expect(mockUpdateDeployment.mock.calls.length).toBe(1);
        expect(mockGetTemplate.mock.calls.length).toBe(1);
        expect(mockDeployDeployment.mock.calls.length).toBe(1);

    });

    it('should get a deployment', async () => {
        const deviceId = '<some-device-id>';
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

        const response = await instance.get(deploymentId, deviceId);

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
        const mockedDeviceExistsInRegistryResponse = true;
        const mockedlistDeploymentResponse = {
            deployments: [{
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
        }

        const mockDeviceExistsInRegistry = mockedIotUtil.deviceExistsInRegistry =
            jest.fn().mockReturnValueOnce(mockedDeviceExistsInRegistryResponse);

        const mockListDeployment = mockedDeploymentDao.list =
            jest.fn().mockReturnValueOnce(mockedlistDeploymentResponse);

        const response = await instance.listDeploymentsByDeviceId(deviceId);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('deployments');
        expect(response.deployments.length).toEqual(2);
        expect(mockDeviceExistsInRegistry.mock.calls.length).toBe(1);
        expect(mockListDeployment.mock.calls.length).toBe(1);

    });

    it('should delete a deployment', async () => {
        const deviceId = '<some-device-id>';
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

        const response = await instance.delete(deploymentId, deviceId);

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
        const deployment = {
            'deviceId': 'my-test-core-id',
            'deploymentId': '<some-deployment-id>',
            'deploymentTemplateName': 'my-template',
            'deploymentStatus': DeploymentStatus.RETRY
        }
        const mockedGetTemplateResponse = {
            'name': '<template_name>',
            'source': {
                'type': 's3',
                'bucket': '<some-bucket>',
                'prefix': '<some-prefix>'
            },
            'type': 'agentbased',
            'versionNo': 1,
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'enabled': true,
            'description': '<some-description>'
        };
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

        const mockGetTemplate = mockedTemplatesDao.get =
            jest.fn().mockReturnValueOnce(mockedGetTemplateResponse);

        const mockUpdateDeploymentManager = mockedDeploymentManager.update =
            jest.fn().mockReturnValueOnce(undefined);


        const response = await instance.retry(deployment);

        expect(response).toBeUndefined();
        expect(mockGetTemplate.mock.calls.length).toBe(1);
        expect(mockUpdateDeploymentManager.mock.calls.length).toBe(1);
        expect(mockGetDeployment.mock.calls.length).toBe(1);

    });
})
