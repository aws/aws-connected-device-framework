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
import { DeviceExtractor } from './extractors/device.extractor';
import { GroupExtractor } from './extractors/group.extractor';
import { ExtractService } from './extract.service';

describe('ExtractService', () => {

    let mockedDeviceExtractor: DeviceExtractor;
    let mockedGroupExtractor: GroupExtractor;
    let instance: ExtractService;

    beforeEach(() => {
        mockedDeviceExtractor = createMockInstance(DeviceExtractor);
        mockedGroupExtractor = createMockInstance(GroupExtractor);
        instance = new ExtractService(mockedDeviceExtractor, mockedGroupExtractor);
    });

    it('should extract a device batch', async () => {
        const batch = {
            id: 'some-uuid',
            category: 'device',
            type: 'type1',
            items: [
                'deviceId-1',
                'deviceId-2'
            ],
            timestamp: 'timestamp'
        };

        const mockedDeviceExtractorResponse = {
            id: 'some-uuid',
            category: 'device',
            type: 'type1',
            items: [
                {deviceId: 'deviceId-1', templateId: 'type1'},
                {deviceId: 'deviceId-2', templateId: 'type1'},
            ],
            timestamp: 'timestamp'
        };

        mockedDeviceExtractor.extract = jest.fn().mockReturnValueOnce(mockedDeviceExtractorResponse);

        const response = await instance.extract(batch);

        expect(response).toBeDefined();
        expect(response).toEqual(mockedDeviceExtractorResponse);
        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('category');
        expect(response).toHaveProperty('items');
        expect(response).toHaveProperty('timestamp');

        expect(response.items.length).toEqual(2);
        expect(response.items[0]).toHaveProperty('deviceId');
    });

    it('should extract a group batch', async () => {
        const batch = {
            id: 'some-uuid',
            category: 'group',
            type: 'type1',
            items: [
                'type1/groupPath1',
                'type1/groupPath2'
            ],
            timestamp: 'timestamp'
        };

        const mockedDeviceExtractorResponse = {
            id: 'some-uuid',
            category: 'group',
            type: 'type1',
            items: [
                {groupPath: 'type1/groupPath1', templateId: 'type1'},
                {groupPath: 'type1/groupPath2', templateId: 'type1'},
            ],
            timestamp: 'timestamp'
        };

        mockedGroupExtractor.extract = jest.fn().mockReturnValueOnce(mockedDeviceExtractorResponse);

        const response = await instance.extract(batch);

        expect(response).toBeDefined();
        expect(response).toEqual(mockedDeviceExtractorResponse);
        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('category');
        expect(response).toHaveProperty('items');
        expect(response).toHaveProperty('timestamp');

        expect(response.items.length).toEqual(2);
        expect(response.items[0]).toHaveProperty('groupPath');
    });
});
