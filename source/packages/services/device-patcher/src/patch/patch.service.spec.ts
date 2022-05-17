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

import {PatchService} from './patch.service';
import {PatchDao} from './patch.dao';
import {PatchManager} from './patch.manager';
import {createMockInstance} from 'jest-create-mock-instance';
import {PatchStatus, PatchType} from './patch.model';

describe('PatchService', () => {

    let mockedPatchDao: jest.Mocked<PatchDao>;
    let mockedPatchManager: jest.Mocked<PatchManager>;
    let instance: PatchService;

    beforeEach(() => {
        mockedPatchDao = createMockInstance(PatchDao);
        mockedPatchManager = createMockInstance(PatchManager);

        instance = new PatchService(mockedPatchDao, mockedPatchManager);
    });


    it('should create a patch', async () => {
    
        const patches = [{
            'patchTemplateName': '<some-template-name>',
            'deviceId': '<some-device-id>',
            'patchType': PatchType.AGENTBASED,
            'extraVars': {
                "key1": "val1",
                "key2": "val2"
            }
        },{
            'patchTemplateName': '<some-template-name>',
            'deviceId': '<some-device-id>',
            'patchType': PatchType.AGENTBASED,
            'extraVars': {
                "key1": "val1",
                "key2": "val2"
            }
        }];

        const mockCreatePatch = mockedPatchManager.create =
            jest.fn().mockReturnValueOnce(undefined);
    
        const mockSavePatch = mockedPatchDao.saveBatches =
            jest.fn().mockReturnValueOnce(undefined);

        await instance.createBulk(patches);

        expect(mockCreatePatch.mock.calls.length).toBe(2);
        expect(mockSavePatch.mock.calls.length).toBe(1);
    
    });

    it('should deploy a patch', async () => {
        const patch = {
            'patchTemplateName': '<some-template-name>',
            'patchType': PatchType.AGENTBASED,
            'deviceId': '<some-device-id>',
            'patchId': '<some-patch-id>'
        };

        const mockUpdatePatch = mockedPatchDao.update =
            jest.fn().mockReturnValueOnce(undefined);

        const mockDeployPatch = mockedPatchManager.deploy =
            jest.fn().mockReturnValueOnce(undefined);

        const response = await instance.deploy(patch);

        expect(response).toBeUndefined();

        expect(mockUpdatePatch.mock.calls.length).toBe(1);
        expect(mockDeployPatch.mock.calls.length).toBe(1);

    });

    it('should get a patch', async () => {
        const patchId = '<some-patch-id>';
        const mockedGetPatchResponse = {
            'deviceId': 'my-test-core-id',
            'patchId': '<some-patch-id>',
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'patchTemplateName': 'my-template',
            'patchStatus': 'success',
            'patchType': 'agentbased'
        }

        const mockGetPatch = mockedPatchDao.get =
            jest.fn().mockReturnValueOnce(mockedGetPatchResponse);

        const response = await instance.get(patchId);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('deviceId');
        expect(response).toHaveProperty('patchId');
        expect(response).toHaveProperty('createdAt');
        expect(response).toHaveProperty('updatedAt');
        expect(response).toHaveProperty('patchTemplateName');
        expect(response).toHaveProperty('patchStatus');
        expect(response).toHaveProperty('patchType');

        expect(mockGetPatch.mock.calls.length).toBe(1);

    });

    it('should list a patches', async () => {
        const deviceId = '<some-device-id>';
        const mockedlistPatchResponse =[
            [{
                'deviceId': 'my-test-core-id',
                'patchId': '<some-patch-id>',
                'createdAt': '<some-date>',
                'updatedAt': '<some-date>',
                'patchTemplateName': 'my-template',
                'patchStatus': 'success',
                'patchType': 'agentbased'
            },{
                'deviceId': 'my-test-core-id',
                'patchId': '<some-patch-id>',
                'createdAt': '<some-date>',
                'updatedAt': '<some-date>',
                'patchTemplateName': 'my-template',
                'patchStatus': 'failed',
                'patchType': 'agentbased'
            }]
        ]


        const mockListPatch = mockedPatchDao.list =
            jest.fn().mockReturnValueOnce(mockedlistPatchResponse);

        const response = await instance.listPatchesByDeviceId(deviceId);

        expect(response).toBeDefined();
        expect(response[0].length).toEqual(2);
        expect(mockListPatch.mock.calls.length).toBe(1);

    });

    it('should delete a patch', async () => {
        const patchId = '<some-patch-id>';

        const mockedGetPatchResponse = {
            'deviceId': 'my-test-core-id',
            'patchId': '<some-patch-id>',
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'patchTemplateName': 'my-template',
            'patchStatus': 'success',
            'patchType': 'agentbased'
        }

        const mockGetPatch = mockedPatchDao.get =
            jest.fn().mockReturnValueOnce(mockedGetPatchResponse);

        const mockDeletePatchDao = mockedPatchDao.delete =
            jest.fn().mockReturnValueOnce(undefined);

        const mockDeletePatchManager = mockedPatchManager.delete =
            jest.fn().mockReturnValueOnce(undefined);

        const response = await instance.delete(patchId);

        expect(response).toBeUndefined();
        expect(mockDeletePatchDao.mock.calls.length).toBe(1);
        expect(mockDeletePatchManager.mock.calls.length).toBe(1);
        expect(mockGetPatch.mock.calls.length).toBe(1);

    });

    it('should update a patch', async () => {
        const patch = {
            'deviceId': 'my-test-core-id',
            'patchId': '<some-patch-id>',
            'patchTemplateName': 'my-template',
        }
        const mockedGetPatchResponse = {
            'deviceId': 'my-test-core-id',
            'patchId': '<some-patch-id>',
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'patchTemplateName': 'my-template',
            'patchStatus': 'success',
            'patchType': 'agentbased'
        }

        const mockGetPatch = mockedPatchDao.get =
            jest.fn().mockReturnValueOnce(mockedGetPatchResponse);

        const mockUpdatePatch = mockedPatchDao.update =
            jest.fn().mockReturnValueOnce(undefined);

        const response = await instance.update(patch);

        expect(response).toBeUndefined();
        expect(mockUpdatePatch.mock.calls.length).toBe(1);
        expect(mockGetPatch.mock.calls.length).toBe(1);

    });

    it('should retry a patch', async () => {
        const patchId = '<some-patch-id>';
        const patch = {
            'deviceId': 'my-test-core-id',
            'patchTemplateName': 'my-template',
            'patchStatus': PatchStatus.RETRY
        }

        const mockedGetPatchResponse = {
            'deviceId': 'my-test-core-id',
            'patchId': '<some-patch-id>',
            'createdAt': '<some-date>',
            'updatedAt': '<some-date>',
            'patchTemplateName': 'my-template',
            'patchStatus': 'success',
            'patchType': 'agentbased'
        }

        const mockGetPatch = mockedPatchDao.get =
            jest.fn().mockReturnValueOnce(mockedGetPatchResponse);


        const mockUpdatePatchManager = mockedPatchManager.update =
            jest.fn().mockReturnValueOnce(undefined);


        const response = await instance.retry(patchId, patch);

        expect(response).toBeUndefined();
        expect(mockUpdatePatchManager.mock.calls.length).toBe(1);
        expect(mockGetPatch.mock.calls.length).toBe(1);

    });
})
