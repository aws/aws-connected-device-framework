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
import ow from 'ow';

import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';

import { LabelsDao } from './labels.dao';

@injectable()
export class LabelsService {

    constructor(
        @inject(TYPES.LabelsDao) private labelsDao: LabelsDao ,
    ) {}

    public async getObjectCount(label: string): Promise<{
        label:string,
        total:number
    }> {
        logger.debug(`labels.service:getObjectCount: in: ${label}`);

        ow(label, 'label', ow.string.nonEmpty);

        const result = await this.labelsDao.getObjectCountByLabel(label);

        logger.debug(`labels.service:getObjectCount: out: ${result}`);

        return {
            label,
            total: result.total
        };
    }

    public async getIdsByRange(label:string, range:[number, number]): Promise<string[]> {
        logger.debug(`labels.service: getIdsByRange: in: ${label}, range: ${range}`);

        ow(label, 'label', ow.string.nonEmpty);
        ow(range, 'range', ow.array.nonEmpty);

        const idObjects = await this.labelsDao.listIdObjectsByLabel(label, range);
        const ids = idObjects.map(e => e.id);

        logger.debug(`labels.service: getIdsByRange: out: ${ids}`);

        return ids
    }
}
