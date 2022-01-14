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

import { IdObject } from './labels.dao';

describe('LabelsDao', () => {

    it('should parse out id meta objects', () => {
        const verticies = [{
            'id': 'device___ts9_001',
            'label': 'ts9_device::device'
        },{
            'id': 'device___clarity_001',
            'label': 'device::clarity_device'
        }];

        const idObjects = verticies.map(v => {
            return new IdObject(v);
        });

        expect(idObjects.length).toEqual(2);
        expect(idObjects[0].id).toEqual('ts9_001');
        expect(idObjects[0].type).toEqual('ts9_device');
        expect(idObjects[0].category).toEqual('device');

        expect(idObjects[1].id).toEqual('clarity_001');
        expect(idObjects[1].type).toEqual('clarity_device');
        expect(idObjects[1].category).toEqual('device');

    });

});
