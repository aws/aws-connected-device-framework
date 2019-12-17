/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { sign } from 'jsonwebtoken';

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
            'authorization': createAuthToken('[\"/:*\"]')
        };
        await setClaims()(request, response, next);
        expect(next).toBeCalled();
    });

    it('should parse claims from authorization header as an array', async () => {
        request.headers = {
            'authorization': createAuthToken(['/:*'])
        };
        await setClaims()(request, response, next);
        expect(next).toBeCalled();
    });

    it('should throw an error if unable to parse claims', async () => {
        request.headers = {
            'authorization': createAuthToken('[\'/:*\']')
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
    return sign({cdf_al: claims}, 'shared-secret');
};
