// /*********************************************************************************************************************
//  *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
//  *                                                                                                                    *
//  *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
//  *  with the License. A copy of the License is located at                                                             *
//  *                                                                                                                    *
//  *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
//  *                                                                                                                    *
//  *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
//  *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
//  *  and limitations under the License.                                                                                *
//  *********************************************************************************************************************/
// import 'reflect-metadata';
// import { createMockInstance } from 'jest-create-mock-instance';
// import { LabelsDao } from './labels.dao';
// import { LabelsService } from './labels.service';
//
// describe('LabelsService', () => {
//
//     let mockedLabelsDao: LabelsDao;
//     let instance: LabelsService;
//
//     beforeEach(() => {
//         mockedLabelsDao = createMockInstance(LabelsDao);
//         instance = new LabelsService(mockedLabelsDao);
//     });
//
//     it('should get dictionary of types and list of ids', async () => {
//         const request = ['deviceType1', 'deviceType2', 'groupType1'];
//
//         const mockedLabelsDaoResponse = [{
//             id: 'device001',
//             type: 'deviceType1',
//             category: 'device'
//         },{
//             id: 'device012',
//             type: 'deviceType1',
//             category: 'device'
//         },{
//             id: 'device044',
//             type: 'deviceType2',
//             category: 'device'
//         },{
//             id: 'groupType1/groupPath1',
//             type: 'groupType1',
//             category: 'group'
//         },{
//             id: 'groupType1/groupPath2',
//             type: 'groupType1',
//             category: 'group'
//         }];
//
//         mockedLabelsDao.listIdObjectsByLabels = jest.fn().mockReturnValueOnce(mockedLabelsDaoResponse);
//
//         const response = await instance.getIdsTypeMapByLabels(request);
//
//         expect(response).toHaveProperty('deviceType1');
//         expect(response).toHaveProperty('deviceType2');
//         expect(response).toHaveProperty('groupType1');
//         expect(response.groupType1.length).toEqual(2);
//         expect(response.deviceType1.length).toEqual(2);
//         expect(response.deviceType2.length).toEqual(1);
//         expect(response.groupType1[0]).toEqual('groupType1/groupPath1');
//
//     });
//
//     it('should get dictionary of categories and list of ids', async () => {
//         const request = ['device', 'group'];
//
//         const mockedLabelsDaoResponse = [{
//             id: 'device001',
//             type: 'deviceType1',
//             category: 'device'
//         },{
//             id: 'device012',
//             type: 'deviceType1',
//             category: 'device'
//         },{
//             id: 'device044',
//             type: 'deviceType2',
//             category: 'device'
//         },{
//             id: 'groupType1/groupPath1',
//             type: 'groupType1',
//             category: 'group'
//         },{
//             id: 'groupType1/groupPath2',
//             type: 'groupType1',
//             category: 'group'
//         }];
//
//         mockedLabelsDao.listIdObjectsByLabels = jest.fn().mockReturnValueOnce(mockedLabelsDaoResponse);
//
//         const response = await instance.getIdsCategoryMapByLabels(request);
//
//         expect(response).toHaveProperty('device');
//         expect(response).toHaveProperty('group');
//         expect(response.group.length).toEqual(2);
//         expect(response.group[0]).toEqual('groupType1/groupPath1');
//
//     });
// });
