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
import { generate } from 'shortid';
import moment from 'moment';

import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger';

import { Batch, Batcher, Batches } from '../batch.service';
import { TypeCategory } from '../../types/constants';
import { LabelsService } from '../../labels/labels.service';
import {BatcherBase} from '../batcher.base';

@injectable()
export class CategoryBatcher extends BatcherBase implements Batcher {
    constructor(
        @inject(TYPES.LabelsService) private labelsService: LabelsService,
        @inject('defaults.batch.size') private batchSize: number
    ) {
        super()
    }

    public async batch(): Promise<Batches> {
        logger.debug(`BatchService batch: in`);

        const typeCategories = this.getTypeCategories();

        return await this.getBatchesByCategories(typeCategories);
    }

    private async getBatchesByCategories(categories:string[]): Promise<Batch[]> {
        const batches:Batch[] = [];


        for (const category of categories) {

            const count = await this.labelsService.getObjectCount(category);
            const ranges = this.createRangesByCount(count.total, this.batchSize);

            for(const range of ranges) {
                const batch = new Batch();
                batch.id = generate();
                batch.category = category;
                batch.range = range;
                batch.timestamp = moment().toISOString();
                batch.total = count.total
                batches.push(batch);
            }
        }

        return batches;
    }

    private getTypeCategories() {
        return [TypeCategory.Device, TypeCategory.Group];
    }
}
