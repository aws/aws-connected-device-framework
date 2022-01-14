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

import { TYPES } from '../../di/types';
import { logger } from '../../utils/logger';

import { Extractor, Extracted } from '../extract.service';
import { DevicesService } from '../../devices/devices.service';

import { Batch } from '../../batch/batch.service';
import { TypeCategory } from '../../types/constants';

@injectable()
export class DeviceExtractor implements Extractor {

    private attributesList: string[];

    constructor(
        @inject(TYPES.DevicesService) private deviceService: DevicesService,
        @inject('defaults.etl.extract.deviceExtractor.expandComponents') private expandComponents: boolean,
        @inject('defaults.etl.extract.deviceExtractor.includeGroups') private includeGroups: boolean,
        @inject('defaults.etl.extract.deviceExtractor.attributes') private attributes: string
    ) {
        this.attributesList = this.attributes === ''
            ? []
            : this.attributesList = this.attributes.split(',');
    }

    public async extract(batch: Batch): Promise<Extracted> {
        logger.debug(`DeviceExtractor: extract: in:`);

        const attributes = this.attributesList.length === 0
            ? undefined
            : this.attributesList;

        const deviceItemList = await this.deviceService.getBulk(batch.items, this.expandComponents, attributes, this.includeGroups);

        const extractedBatch = {
            id: batch.id,
            category: TypeCategory.Device,
            type: batch.type,
            items: deviceItemList.results,
            timestamp: batch.timestamp
        };

        logger.debug(`DeviceExtractor: extract: out:`);
        return extractedBatch;
    }
}
