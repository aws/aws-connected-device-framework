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

import { DeviceExtractor } from './extractors/device.extractor';
import { GroupExtractor } from './extractors/group.extractor';

import { Batch } from '../batch/batch.service';
import { TypeCategory } from '../types/constants';

@injectable()
export class ExtractService implements Extractor {
    private readonly extractors: Extractors = {};

    constructor(
        @inject(TYPES.DeviceExtractor) protected deviceExtractor: DeviceExtractor,
        @inject(TYPES.GroupExtractor) protected groupExtractor: GroupExtractor
    ) {
        this.extractors[TypeCategory.Device] = deviceExtractor;
        this.extractors[TypeCategory.Group] = groupExtractor;
    }

    public async extract(batch: Batch): Promise<Extracted> {
        ow(batch, 'batch', ow.object.nonEmpty);
        ow(batch.category, 'batch', ow.string.nonEmpty);

        return await this.extractors[batch.category].extract(batch);
    }
}

export interface Extractor {
    extract(batch: Batch): Promise<Extracted>;
}

export interface Extractors {
    [key: string]: Extractor;
}

export class Extracted {
    id: string | number;
    category: string;
    type?: string;
    items: unknown[];
    timestamp: number;
}
