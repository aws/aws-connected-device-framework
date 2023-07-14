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
import { createMockInstance } from 'jest-create-mock-instance';
import 'reflect-metadata';
import { LoadService } from './load.service';
import { S3Loader } from './loaders/s3.loader';

describe('LoadService', () => {
    let mockedS3Loader: S3Loader;
    let instance: LoadService;

    beforeEach(() => {
        mockedS3Loader = createMockInstance(S3Loader);
        instance = new LoadService(mockedS3Loader, 'S3');
    });

    it('should load batch to S3', async () => {
        const batch = {
            id: 'some-uuid',
            category: 'device',
            type: 'type1',
            items: ['deviceId-1', 'deviceId-2'],
            timestamp: 1643230032656,
        };

        const mockedS3LoaderResponse = {
            batchId: 'some-uuid',
            exportBucket: 'myBucket',
            exportKey: 'assetlibrary-export/device/type1/dt=YYYY-MM-DD-HH-MM/some-uuid.json',
        };

        mockedS3Loader.load = jest.fn().mockReturnValueOnce(mockedS3LoaderResponse);

        const response = await instance.load(batch);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('batchId');
        expect(response).toHaveProperty('exportBucket');
        expect(response).toHaveProperty('exportKey');
    });
});
