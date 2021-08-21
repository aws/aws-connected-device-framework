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

describe('CategoryBatcher', () => {

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

    it('should create batches by categories', async () => {

        const mockedRequest1 = {
            'devicetype1': ['deviceId-1', 'deviceId-1'],
            'devicetype2': ['deviceId-1', 'deviceId-1']
        };
        const mockedRequest2 = {
            'grouptype1': [ 'type1/grouppath-1', 'type1/grouppath-2'],
            'grouptype2': [ 'type2/grouppath-1', 'type2/grouppath-2']
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
        mockedLabelsService.getIdsTypeMapByLabels = jest.fn().mockReturnValueOnce(mockedRequest1).mockReturnValueOnce(mockedRequest2);

        const response =  await instance.batch();

        expect(response[0]).toHaveProperty('timestamp');
        expect(response[0]).toHaveProperty('category');
        expect(response[0]).toHaveProperty('id');
        expect(response[0]).toHaveProperty('items');
        expect(response[0]).toHaveProperty('type');

        expect(response[0].category).toEqual('device');
        expect(response[0].items.length).toEqual(2);
        expect(response[0].type).toEqual('devicetype1');
        expect(response[0].items[0]).toEqual('deviceId-1');

        expect(response[2].category).toEqual('group');
        expect(response[2].items.length).toEqual(2);
        expect(response[2].type).toEqual('grouptype1');
        expect(response[2].items[0]).toEqual('type1/grouppath-1');

    });

});
