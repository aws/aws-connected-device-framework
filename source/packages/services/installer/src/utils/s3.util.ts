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
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
export class S3Utils {
    private s3: S3Client;

    public constructor(region: string) {
        this.s3 = new S3Client({ region });
    }

    public async uploadStreamToS3(
        bucket: string,
        key: string,
        body: Readable | ReadableStream | Blob | string | Uint8Array | Buffer
    ): Promise<void> {
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
