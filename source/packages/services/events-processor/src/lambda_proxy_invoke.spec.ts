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

const { handler } = require('./lambda_proxy_invoke');

describe('LambdaProxyInvoke', () => {
    beforeEach(() => {});

    it('error on missing eventSourceId ', async () => {
        let err: Error;
        try {
            await handler(
                {
                    principal: 'mockPrincipal',
                    principalValue: 'mockPrincipalValue',
                },
                {}
            );
        } catch (e: any) {
            err = e;
        }

        expect(err.message).toEqual('Missing eventSourceId');
    });
    it('error on missing eventSourceId ', async () => {
        let err: Error;
        try {
            await handler(
                {
                    eventSourceId: 'mockEventSourceId',
                    principalValue: 'mockPrincipalValue',
                },
                {}
            );
        } catch (e: any) {
            err = e;
        }

        expect(err.message).toEqual('Missing principal');
    });
    it('error on missing eventSourceId ', async () => {
        let err: Error;
        try {
            await handler(
                {
                    eventSourceId: 'mockEventSourceId',
                    principal: 'mockPrincipal',
                },
                {}
            );
        } catch (e: any) {
            err = e;
        }

        expect(err.message).toEqual('Missing principalValue');
    });
});
