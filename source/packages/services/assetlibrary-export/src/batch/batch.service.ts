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
import pLimit from 'p-limit';

import { TYPES } from '../di/types';

import { S3Utils } from '../utils/s3.util';
import { CategoryBatcher } from './batchers/category.batcher';
import { TypeBatcher } from './batchers/type.batcher';

@injectable()
export class BatchService implements Batcher {
    private readonly PROMISE_CONCURRENCY_LIMIT = 10;

    private batchers = {};

    constructor(
        @inject(TYPES.CategoryBatcher) protected categoryBatcher: CategoryBatcher,
        @inject(TYPES.TypeBatcher) protected typeBatcher: TypeBatcher,
        @inject('defaults.batch.size') public batchSize: number,
        @inject('defaults.batch.by') public batchBy: string,
        @inject('aws.s3.export.bucket') private exportBucket: string,
        @inject('aws.s3.export.prefix') private exportKeyPrefix: string,
        @inject(TYPES.S3Utils) private s3Utils: S3Utils
    ) {
        this.batchers['type'] = typeBatcher;
        this.batchers['category'] = categoryBatcher;
    }

    public async batch(): Promise<Batches> {
        const batches = await this.batchers[this.batchBy].batch();
        const s3Saves: Promise<AWS.S3.PutObjectOutput>[] = [];

        const limit = pLimit(this.PROMISE_CONCURRENCY_LIMIT);

        // save individual batches to S3 for etl
        // optimization for step function
        for (const index in batches) {
            const batch = batches[index];
            batch.id = index;
            const key = `${this.exportKeyPrefix}_temp/${batch.id}`;
            s3Saves.push(limit(() => this.s3Utils.save(this.exportBucket, key, batch)));
        }
        // concurrently save the individual batches to s3
        await Promise.all(s3Saves);

        return batches;
    }
}

export interface Batches extends Array<Batch> {
    [index: number]: Batch;
}

export class Batch {
    id: string | number;
    category: string;
    type?: string;
    range?: [number, number];
    total?: number;
    items: string[];
    timestamp: number;
}

export interface Batcher {
    batch(labels?: string[]): Promise<Batches>;
}
