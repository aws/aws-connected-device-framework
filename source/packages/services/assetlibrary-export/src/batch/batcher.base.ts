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
import { injectable } from 'inversify';

@injectable()
export class BatcherBase {

    public createRangesByCount(count:number, batchSize:number):Array<[number, number]> {
        const batches = (count / batchSize) >> 0;

        const hasRemainder = (count % batchSize) > 0

        const result = []
        let start = 0
        let end = 0;

        for(let i=0; i<=batches; i++) {
            start = end;
            end = end + batchSize;

            if(end <= count) {
                const range:[number, number] = [start, end];
                result.push(range);
            }
        }

        if(hasRemainder) {
            const remainder = count % batchSize
            const range:[number, number] = [start, start + remainder];
            result.push(range);
        }

        return result
    }

}
