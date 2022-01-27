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

import { TypeBatcher } from './type.batcher';
import { LabelsService } from '../../labels/labels.service';
import { TypesService } from '../../types/types.service';

describe('TypeBatcher', () => {

    let mockedLabelsService: jest.Mocked<LabelsService>;
    let mockedTypesService: jest.Mocked<TypesService>;
    let instance: TypeBatcher;
    let mockedBatchSize: number;

    beforeEach(() => {
        mockedLabelsService = createMockInstance(LabelsService);
        mockedTypesService = createMockInstance(TypesService);
        mockedBatchSize = 100;

        instance = new TypeBatcher(mockedTypesService, mockedLabelsService, mockedBatchSize);
    });

    it('should create batches by types', async () => {

        const mockedRequest1 = {
            'label': 'devicetype1',
            'total': 500
        };

        const mockedRequest2 = {
            'label': 'devicetype2',
            'total': 500
        };

        const mockedRequest3 = {
            'label': 'grouptype2',
            'total': 500
        };

        const mockedRequest4 = {
            'label': 'grouptype2',
            'total': 500
        };

        const mockedDeviceTypes = [{
            templateId: 'devicetype1'
        }, {
            templateId: 'devicetype2'
        }];

        const mockedGroupTypes = [{
            templateId: 'grouptype1'
        }, {
            templateId: 'grouptype2'
        }];

        mockedTypesService.list = jest.fn().mockReturnValueOnce(mockedDeviceTypes).mockReturnValueOnce(mockedGroupTypes);
        mockedLabelsService.getObjectCount = jest.fn()
            .mockReturnValueOnce(mockedRequest1)
            .mockReturnValueOnce(mockedRequest2)
            .mockReturnValueOnce(mockedRequest3)
            .mockReturnValueOnce(mockedRequest4);

        const response =  await instance.batch();

        expect(response.length).toEqual(20);

        expect(response[0]).toHaveProperty('timestamp');
        expect(response[0]).toHaveProperty('category');
        expect(response[0]).toHaveProperty('id');
        expect(response[0]).toHaveProperty('range');
        expect(response[0]).toHaveProperty('type');

    });

});
