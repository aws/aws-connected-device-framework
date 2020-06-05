/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

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
