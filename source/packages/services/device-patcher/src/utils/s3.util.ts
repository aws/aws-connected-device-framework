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

import { TYPES } from '../di/types';
import { logger } from './logger.util';

@injectable()
export class S3Utils {

    private s3: AWS.S3;

    public constructor(
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3
    ) {
        this.s3 = s3Factory();
    }

    public async generatePresignedUrl(bucketName:string, key:string, presignedUrlExpiresInSeconds?:number, forUpload?:boolean) : Promise<string> {
        logger.debug(`s3.util: generatePresignedUrl: in: bucketName:${bucketName}, key:${key}, presignedUrlExpiresInSeconds:${presignedUrlExpiresInSeconds}`);
        const params = {
            Bucket: bucketName,
            Key: key,
            Expires: presignedUrlExpiresInSeconds

        };
        const operation = forUpload? 'putObject' : 'getObject';
        const signedUrl = await this.s3.getSignedUrl(operation, params);
        logger.debug(`s3.util: generatePresignedUrl: exit: signedUrl:${signedUrl}`);
        return signedUrl;
    }

}
