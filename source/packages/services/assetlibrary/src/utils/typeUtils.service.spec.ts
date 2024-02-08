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

    const offsetsAndExpectedSuccesses = [
        { label: 'number as number', input: 1, expected: 1 },
        { label: 'number as string', input: '1', expected: 1 },
        { label: 'undefined', input: undefined, expected: 0 },
        { label: 'undefined as string', input: 'undefined', expected: 0 },
    ];

    offsetsAndExpectedSuccesses.forEach((metadata) => {
        it(metadata.label, () => {
            executeAndVerifySuccess(metadata.input as number, metadata.expected as any, 1, 1);
        });
    });

    const invalidOffsetRegExp = new RegExp(/Invalid offset =/);
    const negativeOffsetRegExp = new RegExp(
        /Expected number `offset` to be greater than or equal to 0, got -1/
    );
    const offsetsAndExpectedFailures = [
        { label: 'character', input: 'x', expected: invalidOffsetRegExp },
        { label: 'null', input: null, expected: invalidOffsetRegExp },
        { label: 'empty string', input: '', expected: invalidOffsetRegExp },
        { label: 'space', input: '  ', expected: invalidOffsetRegExp },
        { label: 'NaN', input: NaN, expected: invalidOffsetRegExp },
        { label: 'negative', input: -1, expected: negativeOffsetRegExp },
    ];

    offsetsAndExpectedFailures.forEach((metadata) => {
        it(metadata.label, () => {
            executeAndVerifyError(
                metadata.input as number,
                metadata.expected as any,
                1,
                '1',
                'offset'
            );
        });
    });

    const countsAndExpectedSuccess = [
        { label: 'number as number', input: 1, expected: 1 },
        { label: 'number as string', input: '1', expected: 1 },
        { label: 'undefined', input: undefined, expected: 500 }, // default is five hundred
        { label: 'undefined as string', input: 'undefined', expected: 500 }, // default is five hundred
    ];

    countsAndExpectedSuccess.forEach((metadata) => {
        it(metadata.label, () => {
            executeAndVerifySuccess(1, 1, metadata.input as number, metadata.expected as any);
        });
    });

    const invalidCountRegExp = new RegExp(/Invalid count =/);
    const negativeCountRegExp = new RegExp(
        /Expected number `count` to be greater than or equal to 1, got -1/
    );
    const countsAndExpectedFailures = [
        { label: 'character', input: 'x', expected: invalidCountRegExp },
        { label: 'null', input: null, expected: invalidCountRegExp },
        { label: 'empty string', input: '', expected: invalidCountRegExp },
        { label: 'space', input: '  ', expected: invalidCountRegExp },
        { label: 'NaN', input: NaN, expected: invalidCountRegExp },
        { label: 'negative', input: -1, expected: negativeCountRegExp },
    ];

    countsAndExpectedFailures.forEach((metadata) => {
        it(metadata.label, () => {
            executeAndVerifyError(
                1,
                '1',
                metadata.input as number,
                metadata.expected as any,
                'count'
            );
        });
    });

    function executeAndVerifySuccess(
        offsetInput: number,
        offsetExpected: number,
        countInput: number,
        countExpected: number
    ) {
        // Make the call
        try {
            const { offsetAsInt: offsetResult, countAsInt: countResult } =
                instance.parseAndValidateOffsetAndCount(offsetInput, countInput);

            // Finally, verify the results
            expect(offsetResult).toEqual(offsetExpected);
            expect(countResult).toEqual(countExpected);
        } catch (err) {
            fail(`Should succeed but received error: ${err}`);
        }
    }

    function executeAndVerifyError(
        offsetInput: number,
        offsetExpected: string | RegExp,
        countInput: number,
        countExpected: string | RegExp,
        testing: 'count' | 'offset'
    ) {
        // Make the call
        try {
            const result = instance.parseAndValidateOffsetAndCount(offsetInput, countInput);
            fail(`Call should trigger an error. Got ${result}`);
        } catch (err) {
            expect(err.name).toEqual('ArgumentError'); // verify the error is correct
            // verify we expected the error and the message is correct
            if (testing == 'offset') {
                expect(err.message).toMatch(offsetExpected); // verify the error is correct
            } else if (testing == 'count') {
                expect(err.message).toMatch(countExpected); // verify the error is correct
            }
        }
    }
});
