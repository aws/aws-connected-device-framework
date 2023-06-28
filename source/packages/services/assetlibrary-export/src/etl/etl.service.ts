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
import ow from 'ow';

import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';

import { Batch } from '../batch/batch.service';
import { ExtractService } from './extract.service';
import { TransformService } from './transform.service';
import { LoadService, Loaded } from './load.service';
import { S3Utils } from '../utils/s3.util';
import {LabelsService} from '../labels/labels.service';

@injectable()
export class ETLService {
    constructor(
        @inject(TYPES.ExtractService) private extractService: ExtractService,
        @inject(TYPES.TransformService) private transformService: TransformService,
        @inject(TYPES.LoadService) private loadService: LoadService,
        @inject(TYPES.LabelsService) private labelsService: LabelsService,
        @inject('aws.s3.export.bucket') private exportBucket: string,
        @inject('aws.s3.export.prefix') private exportKeyPrefix: string,
        @inject(TYPES.S3Utils) private s3Utils: S3Utils
    ) {}

    public async processBatch(batchId: string): Promise<Loaded> {
        logger.debug(`ETLService: processBatch in: ${batchId}`);

        ow(batchId, 'deviceId', ow.string.nonEmpty);

        let batch:Batch;
        try {
            batch= await this.s3Utils.get(this.exportBucket, `${this.exportKeyPrefix}_temp/${batchId}`)
        } catch(e) {
            throw new Error("NOT_FOUND");
        }

        const items = await this.labelsService.getIdsByRange(batch.type, batch.range);
        batch.items = items;

        const extractedBatch = await this.extractService.extract(batch);
        const transformedBatch = await this.transformService.transform(extractedBatch);
        const loadedBatch = await this.loadService.load(transformedBatch);


        await this.s3Utils.delete(this.exportBucket, `${this.exportKeyPrefix}_temp/${batchId}`)

        logger.debug(`ETLService: processBatch out:`);

        return loadedBatch;

    }
}
