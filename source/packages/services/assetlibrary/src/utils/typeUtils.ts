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
import { owCheckOptionalNumber } from '../utils/inputValidation.util';
import { ArgumentError } from './errors';

@injectable()
export class TypeUtils {
    private readonly DEFAULT_PAGINATION_OFFSET = 0;
    private readonly DEFAULT_PAGINATION_COUNT = 500;
    private readonly MAX_VALID_COUNT = 10000;
    /*
     * This is a stop gap in a greater refactor. Url params (e.g. offset and count) are strings.
     * Typescript does not convert them to numbers when number is declared as their type. They must be manually
     * converted whenever it is necessary that they are numbers.
     *
     * Offset and Count also both require defaults (paginated APIs should default to prevent a DOS when there's significant data).
     *
     * Finally, they both have constraints that must be checked.
     * This method combines that repetitive work into a single helper.
     *
     * TODO: remove this function. This maintains existing functionality but could be much simpler. Since offset and count
     * should always have a default and will always initially be strings, we should only replace them if they're undefined,
     * we should always convert them to numbers, and we should test that they are within the specified
     * range using ow base methods instead of owCheckOptionalNumber.
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
        const countAsInt = this.parseIntErrorOnNaN(count, 'count');

        // this checks if they're in the specified range and also checks for undefined and converts to a number,
        // which are unnecessary now that we have specified defaults
        owCheckOptionalNumber(offsetAsInt, 0, Number.MAX_SAFE_INTEGER, 'offset');
        owCheckOptionalNumber(countAsInt, 1, this.MAX_VALID_COUNT, 'count');

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
}
