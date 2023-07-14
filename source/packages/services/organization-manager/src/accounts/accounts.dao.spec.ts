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
import { AccountsDao } from './accounts.dao';
import { AccountsItem } from './accounts.models';
import AWS = require('aws-sdk');

describe('AccountsDao', function () {
    let mockedDynamoDb: AWS.DynamoDB.DocumentClient;
    let instance: AccountsDao;

    beforeEach(() => {
        mockedDynamoDb = new AWS.DynamoDB.DocumentClient();
        instance = new AccountsDao(
            'fakeAccountsTable',
            'fakeGsi1',
            'fakeGsi2',
            () => mockedDynamoDb,
        );
    });

    it('createAccount: happy path', async () => {
        let createAccountItem: AccountsItem = {
            email: 'cdf@cdf.com',
            status: 'ACTIVE',
            name: 'cdf-test',
            organizationalUnitId: 'wl-development-tenant',
            regions: ['us-west-2', 'ap-southeast-1'],
            ssoEmail: 'cdf@cdf.com',
            ssoFirstName: 'John',
            ssoLastName: 'Smith',
        };
        const mockPut = (mockedDynamoDb.put = jest
            .fn()
            .mockReturnValueOnce({ promise: () => Promise.resolve({}) }));
        await instance.createAccount(createAccountItem);
        const putParams = mockPut.mock.calls[0][0];
        expect(putParams).toEqual({
            TableName: 'fakeAccountsTable',
            Item: {
                pk: 'AC:cdf-test',
                sk: 'OU:wl-development-tenant',
                email: 'cdf@cdf.com',
                regions: ['us-west-2', 'ap-southeast-1'],
                ssoEmail: 'cdf@cdf.com',
                ssoFirstName: 'John',
                ssoLastName: 'Smith',
                status: 'ACTIVE',
            },
        });
    });

    it('updateRegionsMappingForAccount: happy path', async () => {
        mockedDynamoDb.query = jest.fn().mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    Items: [
                        {
                            pk: 'wl-development-main',
                            sk: 'RG:cdf-one:ap-southeast-2',
                        },
                        {
                            pk: 'wl-development-main',
                            sk: 'RG:cdf-one:us-west-2',
                        },
                    ],
                }),
        });

        const mockedBatchWrite = (mockedDynamoDb.batchWrite = jest
            .fn()
            .mockReturnValueOnce({ promise: () => Promise.resolve({}) }));

        mockedDynamoDb.transactWrite = jest
            .fn()
            .mockReturnValueOnce({ promise: () => Promise.resolve({ Items: [] }) });

        await instance.updateRegionsMappingForAccount('fakeOu', 'fakeAccount', [
            'ap-southeast-2',
            'us-west-1',
        ]);

        const batchWriteRequest = mockedBatchWrite.mock.calls[0][0];
        expect(batchWriteRequest).toEqual({
            RequestItems: {
                fakeAccountsTable: [
                    {
                        DeleteRequest: {
                            Key: {
                                pk: 'wl-development-main',
                                sk: 'RG:cdf-one:ap-southeast-2',
                            },
                        },
                    },
                    {
                        DeleteRequest: {
                            Key: {
                                pk: 'wl-development-main',
                                sk: 'RG:cdf-one:us-west-2',
                            },
                        },
                    },
                ],
            },
        });
    });
});
