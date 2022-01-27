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

    // This function creates exclusive ranges for a given limit (count) and size (batchSize).
    // The function return ranges as sets i.e. input:100, 10,  output: [[0,10] [10, 20] ...]
    // These ranges will be used to query labels form Neptune. Neptune, works with exclusive ranges,
    // where the end of one range is the begining of the next one. i.e. [0,10] [10, 20]
    public createRangesByCount(count:number, batchSize:number):Array<[number, number]> {

        // count/batch ratio, rounded to whole number, to calculate the batches
        const batches = Math.trunc(count / batchSize);

        // check if there is a remainder, since we rounded the batches to a whole number
        const hasRemainder = (count % batchSize) > 0

        const result = []
        let start = 0
        let end = 0;

        // generate ranges, i.e. [0,10] [10, 20] ...
        for(let i=0; i<=batches; i++) {
            start = end;
            end = end + batchSize;

            if(end <= count) {
                const range:[number, number] = [start, end];
                result.push(range);
            }
        }

        // if there is a remainder, then add the remaining items in the batch
        if(hasRemainder) {
            const remainder = count % batchSize
            const range:[number, number] = [start, start + remainder];
            result.push(range);
        }

        return result
    }

}
