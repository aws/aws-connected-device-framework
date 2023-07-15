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
import { sign } from 'jsonwebtoken';
import 'reflect-metadata';

import { Request } from 'jest-express/lib/request';
import { Response } from 'jest-express/lib/response';

import { setClaims } from './authz.middleware';

describe('AuthzMiddleware', () => {
    let request: any;
    let response: any;
    const next = jest.fn();

    beforeEach(() => {
        request = new Request('');
        response = new Response();
    });

    it('should parse claims from authorization header as a string', async () => {
        request.headers = {
            authz: createAuthToken('["/:*"]'),
        };
        await setClaims()(request, response, next);
        expect(next).toBeCalled();
    });

    it('should parse claims from authorization header as an array', async () => {
        request.headers = {
            authz: createAuthToken('["/:*"]'),
        };
        await setClaims()(request, response, next);
        expect(next).toBeCalled();
    });

    it('should throw an error if unable to parse claims', async () => {
        request.headers = {
            authz: createAuthToken('["/:*"]'),
        };
        try {
            await setClaims()(request, response, next);
        } catch (err) {
            expect(err.message).toBe('Failed to parse claims');
        }
    });

    it('should send 403 response if fails to validate headers', async () => {
        await setClaims()(request, response, next);
        expect(response.sendStatus).toBeCalled();
        expect(response.sendStatus.mock.calls[0][0]).toBe(403);
    });

    afterAll(() => {
        request.resetMock();
        response.resetMock();
    });
});

const createAuthToken = (claims: any) => {
    return sign({ cdf_al: claims }, 'shared-secret');
};
