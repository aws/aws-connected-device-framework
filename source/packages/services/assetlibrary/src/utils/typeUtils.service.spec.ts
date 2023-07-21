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

import { TypeUtils } from './typeUtils';

describe('typeUtils', () => {
    let instance: TypeUtils;

    beforeEach(() => {
        instance = new TypeUtils();
    });

    it('happy path', () => {
        executeAndVerifySuccess(1, 1);
    });

    it('character', () => {
        executeAndVerifySuccess('x', undefined);
    });

    it('number as string', () => {
        executeAndVerifySuccess('1', 1);
    });

    it('undefined', () => {
        executeAndVerifySuccess(undefined, undefined);
    });

    it('null', () => {
        executeAndVerifySuccess(null, undefined);
    });

    it('empty string', () => {
        executeAndVerifySuccess('', undefined);
    });

    it('space', () => {
        executeAndVerifySuccess(' ', undefined);
    });

    function executeAndVerifySuccess(input: unknown, expected: number) {
        // Make the call
        const result = instance.parseInt(input as string);

        // Finally, verify the results
        expect(result).toEqual(expected);
    }
});
