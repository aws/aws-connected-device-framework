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

import { BatcherBase } from './batcher.base';

describe('BatchBase', () => {
    let instance: BatcherBase;

    it('should create ranges by count', () => {
        const count = 19;
        const batchSize = 5;

        const expectedRanges = [
            [0, 5],
            [5, 10],
            [10, 15],
            [15, 19],
        ];

        instance = new BatcherBase();

        const response = instance.createRangesByCount(count, batchSize);

        expect(response.length).toEqual(4);
        expect(response).toEqual(expectedRanges);
    });
});
