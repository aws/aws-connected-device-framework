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
import AWS = require('aws-sdk');
import { ManifestDao } from "./manifest.dao";

describe('Templates Dao', () => {

    let mockedDynamoDb: AWS.DynamoDB.DocumentClient;
    let instance: ManifestDao;

    beforeEach(() => {
        mockedDynamoDb = new AWS.DynamoDB.DocumentClient();
        instance = new ManifestDao('fakeAccountsTable', () => mockedDynamoDb)
    })

    it('getAccountsRegionsByOu: happy path', async () => {
        mockedDynamoDb.query = jest.fn().mockReturnValueOnce({
            promise: () => Promise.resolve({
                Items: [
                    {
                        pk: 'OU:wl-development-tenant',
                        sk: 'RG:cdf-test:ap-southeast-1',
                        accountId: 'cdf-test'
                    },
                    {
                        pk: 'OU:wl-development-tenant',
                        sk: 'RG:cdf-test:us-west-2',
                        accountId: 'cdf-test'
                    },
                    {
                        pk: 'OU:wl-development-tenant',
                        sk: 'RG:cdf-test:us-west-1',
                        accountId: 'cdf-test'
                    },
                    {
                        pk: 'OU:wl-development-tenant',
                        sk: 'RG:cdf-two:ap-southeast-1',
                        accountId: 'cdf-two'
                    },
                    {
                        pk: 'OU:wl-development-tenant',
                        sk: 'RG:cdf-two:us-west-2',
                        accountId: 'cdf-two'
                    }
                ]
            })
        })
        const result = await instance.getRegionAccountForOu("fakeOuName");
        expect(result['ap-southeast-1'].accounts).toEqual(['cdf-test', 'cdf-two'])
        expect(result['us-west-2'].accounts).toEqual(['cdf-test', 'cdf-two'])
        expect(result['us-west-1'].accounts).toEqual(['cdf-test'])
    })
})
