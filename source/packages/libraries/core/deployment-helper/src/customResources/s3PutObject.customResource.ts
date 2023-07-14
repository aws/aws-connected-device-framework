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
import { CustomResourceEvent } from './customResource.model';
import { CustomResource } from './customResource';
import { logger } from '@awssolutions/simple-cdf-logger';

@injectable()
export class S3PutObjectCustomResource implements CustomResource {
    private s3: AWS.S3;

    constructor(@inject(TYPES.S3Factory) s3Factory: () => AWS.S3) {
        this.s3 = s3Factory();
    }

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.info(
            `S3PutObjectCustomResource: create: customResourceEvent:${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        const params: AWS.S3.PutObjectRequest = {
            Bucket: customResourceEvent.ResourceProperties.BucketName,
            Key: customResourceEvent.ResourceProperties.Key,
            ACL: customResourceEvent.ResourceProperties.ACL,
            Body: customResourceEvent.ResourceProperties.Body,
            ContentType: customResourceEvent.ResourceProperties.ContentType,
        };

        await this.s3.putObject(params).promise();
        return {};
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.info(
            `S3PutObjectCustomResource: update: customResourceEvent:${JSON.stringify(
                customResourceEvent,
            )}`,
        );
        return await this.create(customResourceEvent);
    }

    public async delete(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.info(
            `S3PutObjectCustomResource: delete: customResourceEvent:${JSON.stringify(
                customResourceEvent,
            )}`,
        );
        return {};
    }
}
