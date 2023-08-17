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
import { injectable } from 'inversify';
import ow from 'ow';

import { Extracted } from './extract.service';

@injectable()
export class TransformService implements Transformer {
    private readonly transformers: Transformers = {};

    public async transform(batch: Extracted): Promise<Transformed> {
        ow(batch, 'batch', ow.object.nonEmpty);
        ow(batch.category, 'batchCategory', ow.string.nonEmpty);
        ow(batch.id, 'batchId', ow.string.nonEmpty);
        ow(batch.type, 'batchType', ow.string.nonEmpty);
        ow(batch.items, 'batchType', ow.array.nonEmpty);
        ow(batch.timestamp, 'batchType', ow.number.greaterThan(0));

        if (!this.transformers[batch.category]) {
            return {
                id: batch.id,
                category: batch.category,
                type: batch.type,
                items: batch.items,
                timestamp: batch.timestamp,
            };
        }
        return await this.transformers[batch.category].transform(batch);
    }
}

export interface Transformer {
    transform(batch: Extracted): Promise<Transformed>;
}

export interface Transformers {
    [key: string]: Transformer;
}

export class Transformed {
    id: string | number;
    category: string;
    type: string;
    items: unknown[];
    timestamp: number;
}
