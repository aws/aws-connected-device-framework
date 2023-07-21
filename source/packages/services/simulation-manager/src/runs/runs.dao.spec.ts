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

import AWS from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { RunsDao } from './runs.dao';

describe('RunsDao', () => {
    let mockedDocumentClient: AWS.DynamoDB.DocumentClient;
    let instance: RunsDao;

    beforeEach(() => {
        mockedDocumentClient = new AWS.DynamoDB.DocumentClient();
        const mockedDocumentClientFactory = () => {
            return mockedDocumentClient;
        };
        instance = new RunsDao(mockedDocumentClientFactory);
    });

    it('list device state aggregation successful', async () => {
        const simId = 'fake-test-id';

        const mockItems1 = [
            {
                pk: `S:123`,
                sk: `S:123`,
                simulationId: simId,
            },
            {
                pk: `S:456`,
                sk: `E:456`,
                simulationId: simId,
            },
            {
                pk: `S:789`,
                sk: `U:789`,
                simulationId: simId,
            },
        ];

        const mockItems2 = [
            {
                pk: `S:abc`,
                sk: `S:abc`,
                simulationId: simId,
            },
            {
                pk: `S:def`,
                sk: `E:def`,
                simulationId: simId,
            },
        ];

        // mocks
        const mockedQuery = (mockedDocumentClient.query = jest
            .fn()
            .mockImplementationOnce(() => {
                return {
                    promise: () => {
                        const r: DocumentClient.QueryOutput = {
                            Items: mockItems1,
                            LastEvaluatedKey: {
                                pk: `S:789`,
                                sk: `U:789`,
                            },
                        };
                        return Promise.resolve(r);
                    },
                };
            })
            .mockImplementationOnce(() => {
                return {
                    promise: () => {
                        const r: DocumentClient.QueryOutput = {
                            Items: mockItems2,
                        };
                        return Promise.resolve(r);
                    },
                };
            }));

        // execute
        const res = await instance.listDeviceState('test-sim-id');

        const combinedItems = [...mockItems1, ...mockItems2];

        // verification
        expect(mockedQuery).toBeCalledTimes(2);
        expect(res).toEqual(combinedItems);
    });
});
