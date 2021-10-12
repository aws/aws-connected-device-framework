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
import { TargetDao } from './target.dao';
import AWS from 'aws-sdk';
import { EmailTargetItem, SMSTargetItem, PushTargetItem, DynamodDBTargetItem } from './targets.models';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

describe('TargetDao', () => {

    let mockedCachedDocumentClient: AWS.DynamoDB.DocumentClient;
    let instance: TargetDao;

    // stubs
    const stubbedGoodEmailItem = new EmailTargetItem();
    stubbedGoodEmailItem.subscriptionId = 'sub1';
    stubbedGoodEmailItem.address = 'someone@somewhere.com';

    const stubbedGoodSMSItem = new SMSTargetItem();
    stubbedGoodSMSItem.subscriptionId = 'sub1';
    stubbedGoodSMSItem.phoneNumber = '5555555555';

    const stubbedGoodPushGcm = new PushTargetItem();
    stubbedGoodPushGcm.subscriptionId = 'sub1';
    stubbedGoodPushGcm.platformApplicationArn = 'arn:aws:sns:us-west-2:123456789012:app/GCM/MyApplication';
    stubbedGoodPushGcm.token = 'EXAMPLE12345';
    stubbedGoodPushGcm.platformEndpointArn = 'arn:aws:sns:us-west-2:123456789012:endpoint/GCM/MyApplication/12345678-abcd-9012-efgh-345678901234';

    const stubbedGoodDynamoDBItem = new DynamodDBTargetItem();
    stubbedGoodDynamoDBItem.subscriptionId = 'sub1';
    stubbedGoodDynamoDBItem.tableName = 'some_table';
    stubbedGoodDynamoDBItem.attributeMapping = {
        a: 'b'
    };

    beforeEach(() => {
        mockedCachedDocumentClient = new AWS.DynamoDB.DocumentClient();
        const mockedCachedDocumentClientFactory = () => {
            return mockedCachedDocumentClient;
        };
        instance = new TargetDao('eventConfig', mockedCachedDocumentClientFactory);
    });

    it('email create saves succesful', async() => {

        const eventSourceId = 'es';
        const principal = 'p';
        const principalValue = 'pv';

        const expectedPutItem:DocumentClient.PutItemInput = {
            TableName: 'eventConfig',
            Item: {
                pk: `S:${stubbedGoodEmailItem.subscriptionId}`,
                sk: `ST:email:${stubbedGoodEmailItem.address}`,
                gsi2Key: `ES:${eventSourceId}:${principal}:${principalValue}`,
                gsi2Sort: `S:${stubbedGoodEmailItem.subscriptionId}:ST:email:${stubbedGoodEmailItem.address}`
            }
        };

        // mocks
        const mockedPut = mockedCachedDocumentClient.put = jest.fn().mockImplementationOnce(()=>  {
            return {
              promise: () =>  {
                  return {};
              }
            };
        });

        // execute
        await instance.create(stubbedGoodEmailItem, eventSourceId, principal, principalValue);

        // verification
        expect(mockedPut).toBeCalledWith(expectedPutItem);

    });

});
