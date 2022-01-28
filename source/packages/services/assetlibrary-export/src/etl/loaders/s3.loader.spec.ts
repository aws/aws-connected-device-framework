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
import AWS, { AWSError } from 'aws-sdk';

import { S3Loader } from './s3.loader';

describe('S3Loader', () => {

    let mockedS3: AWS.S3;
    let instance: S3Loader;

    beforeEach(() => {
        mockedS3 = new AWS.S3();
        const mockedS3Factory = () => {
            return mockedS3;
        };

        const loadPath = '${aws.s3.export.prefix}${batch.category}/${batch.type}/dt=${dateTimeFormat(batch.timestamp, \'yyyy-LL-dd-HH-mm\')}/${batch.id}.json';

        instance = new S3Loader(mockedS3Factory, loadPath, 'myBucket', 'assetlibrary-export/');

    });

    it('should load the batch to S3', async () => {
        const Batch = {
            id: 'some-uuid',
            category: 'device',
            type: 'type1',
            items: [
                'deviceId-1',
                'deviceId-2'
            ],
            timestamp: 1643230032656
        };

        const mockS3PutObjectResponse = new MockAWSPromise<AWS.S3.Types.PutObjectOutput>();
        mockS3PutObjectResponse.response = {
            ETag: 'some-etag'
        };

        const mockS3PutObject = mockedS3.putObject = <any> jest.fn().mockReturnValueOnce(mockS3PutObjectResponse);

        const response = await instance.load(Batch);

        expect(response).toBeDefined();
        expect(response).toHaveProperty('batchId');
        expect(response).toHaveProperty('exportBucket');
        expect(response).toHaveProperty('exportKey');

        expect(response.batchId).toEqual('some-uuid');
        expect(response.exportBucket).toEqual('myBucket');
        expect(response.exportKey).toEqual('assetlibrary-export/device/type1/dt=2022-01-26-20-47/some-uuid.json');

        expect(mockS3PutObject.mock.calls[0][0]).toStrictEqual({
            Bucket: 'myBucket',
            Key: 'assetlibrary-export/device/type1/dt=2022-01-26-20-47/some-uuid.json',
            Body: JSON.stringify([
                'deviceId-1',
                'deviceId-2'
            ]),
            ContentType: 'application/json',
        });

    });
});

class MockAWSPromise<T> {
    public response: T;
    public error: AWSError = null;

    promise(): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}
