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

import { LabelsService } from '../../labels/labels.service';
import { CategoryBatcher } from '../batchers/category.batcher';

describe('CategoryBatcher', () => {
    let mockedLabelsService: jest.Mocked<LabelsService>;
    let instance: CategoryBatcher;

    beforeEach(() => {
        mockedLabelsService = createMockInstance(LabelsService);

        instance = new CategoryBatcher(mockedLabelsService, 100);
    });

    it('should create batches by categories', async () => {
        const mockedRequest1 = {
            label: 'device',
            total: 500,
        };

        const mockedRequest2 = {
            label: 'group',
            total: 500,
        };

        mockedLabelsService.getObjectCount = jest
            .fn()
            .mockReturnValueOnce(mockedRequest1)
            .mockReturnValueOnce(mockedRequest2);

        const response = await instance.batch();

        expect(response.length).toEqual(10);

        expect(response[0]).toHaveProperty('timestamp');
        expect(response[0]).toHaveProperty('category');
        expect(response[0]).toHaveProperty('id');
        expect(response[0]).toHaveProperty('range');
        expect(response[0].type).toBeUndefined();
    });
});
