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

import { CategoryBatcher } from '../batchers/category.batcher';
import { LabelsService } from '../../labels/labels.service';

describe('CategoryBatcher', () => {

    let mockedLabelsService: jest.Mocked<LabelsService>;
    let instance: CategoryBatcher;

    beforeEach(() => {
        mockedLabelsService = createMockInstance(LabelsService);

        instance = new CategoryBatcher(mockedLabelsService, 100);
    });

    it('should create batches by categories', async () => {

        const mockedRequest = {
            'device': ['deviceId-1', 'deviceId-1'],
            'group': [ 'type1/grouppath-1', 'type2/grouppath-2']
        };

        mockedLabelsService.getIdsCategoryMapByLabels = jest.fn().mockReturnValueOnce(mockedRequest);

        const response =  await instance.batch();

        expect(response[0]).toHaveProperty('timestamp');
        expect(response[0]).toHaveProperty('category');
        expect(response[0]).toHaveProperty('id');
        expect(response[0]).toHaveProperty('items');
        expect(response[0].type).toBeUndefined();

        expect(response[0].category).toEqual('device');
        expect(response[0].items.length).toEqual(2);

        expect(response[0].items[0]).toEqual('deviceId-1');

    });

});
