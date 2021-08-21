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
import {logger} from '../utils/logger.util';

@injectable()
export class S3Utils {

    private s3: AWS.S3;

    public constructor(
	    @inject(TYPES.S3Factory) s3Factory: () => AWS.S3
    ) {
        this.s3 = s3Factory();
    }

    public uploadStreamToS3(bucket:string, key:string, body:NodeJS.ReadableStream) : Promise<string> {
        logger.debug(`s3.util uploadStreamToS3: in: bucket:${bucket}, key:${key}`);

        /* eslint-disable @typescript-eslint/no-explicit-any */
        return new Promise((resolve:any,reject:any) =>  {
            const params = {
                Bucket: bucket,
                Key: key,
                Body: body
            };
            this.s3.upload(params, (err: any, data: any) => {
                if (err) {
                    return reject(err);
                }
                const eTag = data.ETag;

                return resolve(eTag);
            });
        });
    }
}
