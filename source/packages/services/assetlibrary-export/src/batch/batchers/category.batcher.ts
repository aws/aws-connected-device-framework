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
import * as _ from 'lodash';
import moment from 'moment';

import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger';

import { Batch, Batcher, Batches } from '../batch.service';
import { TypeCategory } from '../../types/constants';
import { LabelsService } from '../../labels/labels.service';

@injectable()
export class CategoryBatcher implements Batcher {
    constructor(
        @inject(TYPES.LabelsService) private labelsService: LabelsService,
        @inject('defaults.batch.size') private batchSize: number
    ) {}

    public async batch(): Promise<Batches> {
        logger.debug(`BatchService batch: in`);

        const typeCategories = this.getTypeCategories();

        return await this.getBatchesByCategories(typeCategories);
    }

    private async getBatchesByCategories(categories:string[]): Promise<Batch[]> {
        let batches:Batch[] = [];


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

    // TODO:  refactor this to a utility or a base class
    private createRangesByCount(count:number, batchSize:number):Array<[number, number]> {
        const batches = (count / batchSize) >> 0;

        const hasRemainder = (count % batchSize) > 0

        const result = []
        let start = 0
        let end = 0;

        for(let i=0; i<=batches; i++) {
            start = end;
            end = end + batchSize;

            if(end <= count) {
                const range:[number, number] = [start, end];
                result.push(range);
            }
        }

        if(hasRemainder) {
            const remainder = count % batchSize
            const range:[number, number] = [start, start + remainder];
            result.push(range);
        }

        return result
    }

}
