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
import { LabelsDao } from './labels.dao';
import { LabelsService } from './labels.service';

describe('LabelsService', () => {
    let mockedLabelsDao: LabelsDao;
    let instance: LabelsService;

    beforeEach(() => {
        mockedLabelsDao = createMockInstance(LabelsDao);
        instance = new LabelsService(mockedLabelsDao);
    });

    it('should get a count by label', async () => {
        const request = 'someDeviceType';

        const mockedLabelsDaoResponse = {
            label: 'someDeviceType',
            total: 500,
        };

        mockedLabelsDao.getObjectCountByLabel = jest
            .fn()
            .mockReturnValueOnce(mockedLabelsDaoResponse);

        const response = await instance.getObjectCount(request);

        expect(response).toHaveProperty('label');
        expect(response).toHaveProperty('total');
        expect(response.label).toEqual('someDeviceType');
        expect(response.total).toEqual(500);
    });

    it('should get ids for a label and range', async () => {
        const label = 'deviceType1';
        const range: [number, number] = [0, 3];

        const mockedLabelsDaoResponse = [
            {
                id: 'device001',
                type: 'deviceType1',
                category: 'device',
            },
            {
                id: 'device012',
                type: 'deviceType1',
                category: 'device',
            },
            {
                id: 'device044',
                type: 'deviceType1',
                category: 'device',
            },
        ];

        mockedLabelsDao.listIdObjectsByLabel = jest
            .fn()
            .mockReturnValueOnce(mockedLabelsDaoResponse);

        const response = await instance.getIdsByRange(label, range);

        expect(response.length).toEqual(3);
        expect(response[0]).toEqual('device001');
    });
});
