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
import { inject, injectable } from 'inversify';
import { Readable } from 'stream';

import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';

@injectable()
export class S3Utils {
    private s3: S3Client;

    public constructor(@inject(TYPES.S3Factory) s3Factory: () => S3Client) {
        this.s3 = s3Factory();
    }

    public async uploadStreamToS3(
        bucket: string,
        key: string,
        body: Readable | ReadableStream | Blob | string | Uint8Array | Buffer,
    ): Promise<void> {
        logger.debug(`s3.util uploadStreamToS3: in: bucket:${bucket}, key:${key}`);

        const upload = new Upload({
            client: this.s3,
            params: {
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: 'text/plain',
            },
        });
        await upload.done();
    }
}
