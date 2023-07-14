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

import { injectable, inject } from 'inversify';
import ow from 'ow';

import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';

@injectable()
export class S3Utils {
    private s3: AWS.S3;

    public constructor(@inject(TYPES.S3Factory) s3Factory: () => AWS.S3) {
        this.s3 = s3Factory();
    }

    public async save(bucket: string, key: string, object: any): Promise<AWS.S3.PutObjectOutput> {
        logger.debug(
            `S3Loader: save: in: bucket:${bucket}, key:${key}, object:${JSON.stringify(object)}`,
        );

        ow(bucket, 'bucket', ow.string.nonEmpty);
        ow(bucket, 'key', ow.string.nonEmpty);
        ow(object, 'bucket', ow.object.nonEmpty);

        const params: AWS.S3.PutObjectRequest = {
            Bucket: bucket,
            Key: key,
            Body: JSON.stringify(object),
            ContentType: 'application/json',
        };

        const result: AWS.S3.PutObjectOutput = await this.s3.putObject(params).promise();

        logger.debug(`S3Utils: save: out: ${JSON.stringify(result)}`);

        return result;
    }

    public async get(bucket: string, key: string): Promise<any> {
        logger.debug(`S3Loader: get: in: bucket:${bucket}, key:${key}`);

        ow(bucket, 'bucket', ow.string.nonEmpty);
        ow(bucket, 'key', ow.string.nonEmpty);

        const params: AWS.S3.GetObjectRequest = {
            Bucket: bucket,
            Key: key,
        };

        const result: AWS.S3.GetObjectOutput = await this.s3.getObject(params).promise();

        const object = JSON.parse(result.Body.toString());

        logger.debug(`S3Utils: get: out: ${JSON.stringify(object)}`);

        return object;
    }

    public async delete(bucket: string, key: string): Promise<AWS.S3.DeleteObjectOutput> {
        logger.debug(`S3Loader: delete: in: bucket:${bucket}, key:${key}`);

        ow(bucket, 'bucket', ow.string.nonEmpty);
        ow(bucket, 'key', ow.string.nonEmpty);

        const params: AWS.S3.DeleteObjectRequest = {
            Bucket: bucket,
            Key: key,
        };

        const result: AWS.S3.DeleteObjectOutput = await this.s3.deleteObject(params).promise();

        logger.debug(`S3Utils: delete: out: ${JSON.stringify(result)}`);

        return result;
    }
}
