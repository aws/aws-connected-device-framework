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

import { BatchService } from './batch.service';
import { TypeBatcher } from './batchers/type.batcher';
import { CategoryBatcher } from './batchers/category.batcher';
import { S3Utils } from '../utils/s3.util';

describe('BatchService', () => {
    let mockedTypeBatcher: jest.Mocked<TypeBatcher>;
    let mockedCategoryBatcher: jest.Mocked<CategoryBatcher>;
    let mockedS3Utils: jest.Mocked<S3Utils>;
    let instance: BatchService;

    beforeEach(() => {
        mockedS3Utils = createMockInstance(S3Utils);
        mockedTypeBatcher = createMockInstance(TypeBatcher);
        mockedCategoryBatcher = createMockInstance(CategoryBatcher);
    });

    it('should get batches by types', async () => {
        const expected = [
            {
                id: 'some-uuid',
                category: 'device',
                type: 'type1',
                range: [0, 100],
                timestamp: 'timestamp',
            },
            {
                id: 'some-uuid',
                category: 'device',
                type: 'type2',
                range: [100, 200],
                timestamp: 'timestamp',
            },
            {
                id: 'some-uuid',
                category: 'group',
                type: 'type1',
                range: [0, 100],
                timestamp: 'timestamp',
            },
            {
                id: 'some-uuid',
                category: 'group',
                type: 'type2',
                range: [100, 200],
                timestamp: 'timestamp',
            },
        ];

        mockedTypeBatcher.batch = jest.fn().mockReturnValueOnce(expected);

        instance = new BatchService(
            mockedCategoryBatcher,
            mockedTypeBatcher,
            100,
            'type',
            'exportBucket',
            'exportKey',
            mockedS3Utils,
        );

        const response = await instance.batch();

        expect(response).toEqual(expected);
    });

    it('should get batches by categories', async () => {
        const expected = [
            {
                id: 'some-uuid',
                category: 'device',
                range: [0, 100],
                timestamp: 'timestamp',
            },
            {
                id: 'some-uuid',
                category: 'device',
                range: [100, 200],
                timestamp: 'timestamp',
            },
            {
                id: 'some-uuid',
                category: 'group',
                range: [0, 100],
                timestamp: 'timestamp',
            },
            {
                id: 'some-uuid',
                category: 'group',
                range: [100, 200],
                timestamp: 'timestamp',
            },
        ];

        mockedCategoryBatcher.batch = jest.fn().mockReturnValueOnce(expected);

        instance = new BatchService(
            mockedCategoryBatcher,
            mockedTypeBatcher,
            100,
            'category',
            'exportBucket',
            'exportKey',
            mockedS3Utils,
        );

        const response = await instance.batch();

        expect(response).toEqual(expected);
    });
});
