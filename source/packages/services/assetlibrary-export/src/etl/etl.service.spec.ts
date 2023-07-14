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

import { LabelsService } from '../labels/labels.service';
import { ETLService } from './etl.service';
import { ExtractService } from './extract.service';
import { LoadService } from './load.service';
import { TransformService } from './transform.service';

import { S3Utils } from '../utils/s3.util';

describe('ETLService', () => {
    let mockedExtractService: ExtractService;
    let mockedTransformService: TransformService;
    let mockedLoadService: LoadService;
    let mockedLablesService: LabelsService;
    let mockedS3Utils: jest.Mocked<S3Utils>;

    let instance: ETLService;

    beforeEach(() => {
        mockedExtractService = createMockInstance(ExtractService);
        mockedTransformService = createMockInstance(TransformService);
        mockedLoadService = createMockInstance(LoadService);
        mockedLablesService = createMockInstance(LabelsService);
        mockedS3Utils = createMockInstance(S3Utils);

        instance = new ETLService(
            mockedExtractService,
            mockedTransformService,
            mockedLoadService,
            mockedLablesService,
            'exportBucket',
            'exportKey',
            mockedS3Utils,
        );
    });

    it('should process batch', async () => {
        const batchId = 'some-uuid';

        const mockedExtractServiceResponse = {
            id: '1',
            category: 'device',
            type: 'type1',
            items: ['deviceId-1', 'deviceId-2'],
            timestamp: 'timestamp',
        };
        const mockedTransformServiceResponse = {
            id: '1',
            category: 'device',
            type: 'type1',
            items: [
                { deviceId: 'deviceId-1', templateId: 'type1' },
                { deviceId: 'deviceId-2', templateId: 'type1' },
            ],
            timestamp: 'timestamp',
        };
        const mockedLoadServiceResponse = {
            batchId: '1',
            exportBucket: 'myBucket',
            exportKey: 'assetlibrary-export/device/type1/dt=YYYY-MM-DD-HH-MM/some-uuid.json',
        };

        const mockedLabelServiceResponse = ['deviceId-1', 'deviceId-2'];

        const mockedS3UtilsResponse = {
            id: '1',
            category: 'device',
            type: 'type1',
            range: [0, 100],
            timestamp: 'timestamp',
        };

        mockedS3Utils.get = jest.fn().mockReturnValueOnce(mockedS3UtilsResponse);
        mockedLablesService.getIdsByRange = jest
            .fn()
            .mockReturnValueOnce(mockedLabelServiceResponse);
        mockedExtractService.extract = jest.fn().mockReturnValueOnce(mockedExtractServiceResponse);
        mockedTransformService.transform = jest
            .fn()
            .mockReturnValueOnce(mockedTransformServiceResponse);
        mockedLoadService.load = jest.fn().mockReturnValueOnce(mockedLoadServiceResponse);

        const response = await instance.processBatch(batchId);

        expect(response).toBeDefined();
        expect(response).toEqual(mockedLoadServiceResponse);
    });
});
