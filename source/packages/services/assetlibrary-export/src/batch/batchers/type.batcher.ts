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
import { generate } from 'shortid';
import * as _ from 'lodash';
import moment from 'moment';

import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger';

import { TypeCategory } from '../../types/constants';
import { TypesService } from '../../types/types.service';
import { Batch, Batcher, Batches } from '../batch.service';
import { TypeModel } from '../../types/types.models';
import { LabelsService } from '../../labels/labels.service';

@injectable()
export class TypeBatcher implements Batcher {

    constructor(
        @inject(TYPES.TypesService) private typesService: TypesService,
        @inject(TYPES.LabelsService) private labelsService: LabelsService,
        @inject('defaults.batch.size') private batchSize: number
    ) {}

    public async batch(): Promise<Batches> {
        logger.debug(`BatchService batch: in`);

        let batches: Batch[] = [];
        const categories = this.getCategories();

        for (const category of categories) {
            const types = await this.typesService.list(category);
            if (types && types.length > 0) {
                batches = _.concat(batches, await this.getBatchesByTypes(category, types));
            }
        }

        logger.debug(`BatchService batch: out`);
        return batches;

    }


    private async getBatchesByTypes(category:string, types: TypeModel[]): Promise<Batch[]> {
        logger.debug(`types.batcher: getBatchesByTypes in: category: ${category}, types: ${JSON.stringify(types)}`);

        const typeIds = types.map(type => type.templateId);
        let batches:Batch[] = [];

        for(const type of typeIds) {
            const count = await this.labelsService.getObjectCount(type);
            const ranges = this.createRangesByCount(count.total, this.batchSize);

            for(const range of ranges) {
                const batch = new Batch();
                batch.id = generate();
                batch.category = category;
                batch.type = type;
                batch.range = range;
                batch.total = count.total
                batch.timestamp = moment().toISOString();
                batches.push(batch);
            }
        }
        logger.debug(`types.batcher: getBatchesByTypes out: batches:${JSON.stringify(batches)}`);

        return batches;
    }

    private getCategories() {
        return [TypeCategory.Device, TypeCategory.Group];
    }

    // TODO: refactor this to a utility or a base class
    private createRangesByCount(count:number, batchSize:number):Array<[number, number]> {
        logger.debug(`types.batcher: createRangesByCount in: count:${count}, batchSize:${batchSize}`);

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

        logger.debug(`types.batcher: createRangesByCount out: ranges:${JSON.stringify(result)}`);

        return result
    }

}
