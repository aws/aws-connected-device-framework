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

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';

import { Batch } from '../batch/batch.service';
import { ExtractService } from './extract.service';
import { TransformService } from './transform.service';
import { LoadService, Loaded } from './load.service';
import { S3Utils } from '../utils/s3.util';

@injectable()
export class ETLService {
    constructor(
        @inject(TYPES.ExtractService) private extractService: ExtractService,
        @inject(TYPES.TransformService) private transformService: TransformService,
        @inject(TYPES.LoadService) private loadService: LoadService,
        @inject('aws.s3.export.bucket') private exportBucket: string,
        @inject('aws.s3.export.prefix') private exportKeyPrefix: string,
        @inject(TYPES.S3Utils) private s3Utils: S3Utils
    ) {}

    public async processBatch(batchId: string): Promise<Loaded> {

        const batch:Batch = await this.s3Utils.get(this.exportBucket, `${this.exportKeyPrefix}_temp/${batchId}`)

        logger.debug(`ETLService: processBatch in: ${JSON.stringify(batch)}`);

        const extractedBatch = await this.extractService.extract(batch);

        const transformedBatch = await this.transformService.transform(extractedBatch);

        const loadedBatch = await this.loadService.load(transformedBatch);

        // Temporiraly turned off cleanups of the temperory export data
        // await this.s3Utils.delete(this.exportBucket, `${this.exportKeyPrefix}_temp/${batchId}`)

        logger.debug(`ETLService: processBatch out: ${JSON.stringify(loadedBatch)}`);

        return loadedBatch;

    }
}
