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
import { logger } from '@awssolutions/simple-cdf-logger';
import { CustomResourceEvent } from './customResource.model';
import { CustomResource } from './customResource';

@injectable()
export class AppConfigOverrideCustomResource implements CustomResource {
    private s3: AWS.S3;

    constructor(@inject(TYPES.S3Factory) s3Factory: () => AWS.S3) {
        this.s3 = s3Factory();
    }

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        const bucketName = customResourceEvent.ResourceProperties.BucketName;
        const key = customResourceEvent.ResourceProperties.Key;

        return await this.getAppOverrideConfig(bucketName, key);
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return await this.create(customResourceEvent);
    }

    public async getAppOverrideConfig(bucketName: string, key: string): Promise<unknown> {
        logger.debug(`BucketName:${bucketName} - Key: ${key}`);

        const response = {
            config: JSON.stringify({}),
        };

        const bucket_params = {
            Bucket: bucketName,
            Key: key,
        };

        logger.debug(JSON.stringify(bucket_params));

        let result;
        try {
            result = await this.s3.getObject(bucket_params).promise();
            if (result.Body) {
                const body = JSON.parse(result.Body.toString());
                response['config'] = JSON.stringify(body);
            }
            return response;
        } catch (err) {
            logger.error(JSON.stringify(err));
            if (err.code === 'NoSuchKey') {
                return response;
            }

            throw err;
        }
    }

    public async delete(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return {};
    }
}
