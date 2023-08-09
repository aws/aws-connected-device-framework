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
import ow from 'ow';
import { ArgumentError } from './errors';

@injectable()
export class TypeUtils {
    private readonly DEFAULT_PAGINATION_OFFSET = 0;
    private readonly DEFAULT_PAGINATION_COUNT = 500;
    private readonly MAX_VALID_COUNT = 10000;
    /*
     * TODO: this is duplicated from assetlibrary and should be moved to a common shared util.
     * See the assetlibrary implementation for extensive notes.
     */
    public parseAndValidateOffsetAndCount(
        offset?: number,
        count?: number
    ): { offsetAsInt: number; countAsInt: number } {
        // use default count and offset if omitted
        if (offset === undefined) {
            offset = this.DEFAULT_PAGINATION_OFFSET;
        }
        if (count === undefined) {
            count = this.DEFAULT_PAGINATION_COUNT;
        }

        // do the previous parse int (which should be a )
        const offsetAsInt = this.parseIntErrorOnNaN(offset, 'offset');
        const countAsInt = this.parseIntErrorOnNaN(count, 'label');

        // this checks if they're in the specified range and also checks for undefined and converts to a number,
        // which are unnecessary now that we have specified defaults
        this.owCheckOptionalNumber(offsetAsInt, 0, Number.MAX_SAFE_INTEGER, 'offset');
        this.owCheckOptionalNumber(countAsInt, 1, this.MAX_VALID_COUNT, 'count');

        return {
            offsetAsInt,
            countAsInt,
        };
    }

    private parseIntErrorOnNaN(val: unknown, label: string): number {
        const asInt = parseInt(val as string);
        if (isNaN(asInt)) {
            throw new ArgumentError(`Invalid ${label} = ${val}`);
        }
        return asInt;
    }

    private owCheckOptionalNumber = (
        num: any,
        minSize: number,
        maxSize: number,
        label: string
    ): void => {
        if (num === undefined) {
            return;
        }
        const numToCheck = Number(num);
        ow(numToCheck, label, ow.number.greaterThanOrEqual(minSize));
        ow(numToCheck, label, ow.number.lessThanOrEqual(maxSize));
    };
}
