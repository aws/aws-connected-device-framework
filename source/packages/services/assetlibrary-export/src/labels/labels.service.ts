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
import * as _ from 'lodash';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';

import { LabelsDao } from './labels.dao';

@injectable()
export class LabelsService {

    constructor(
        @inject(TYPES.LabelsDao) private labelsDao: LabelsDao ,
    ) {}

    public async getIdsTypeMapByLabels(labels: string[]): Promise<PropertyArrayMap> {
        logger.debug(`labels.service: getIdsTypeMapByLabels: in: ${labels}`);

        const map:PropertyArrayMap = {};
        const idObjects = await this.labelsDao.listIdObjectsByLabels(labels);

        if(idObjects === undefined || idObjects.length === 0) {
            logger.debug(`labels.service: getIdsTypeMapByLabels: out: undefined`);
            return {};
        }

        _.uniq(idObjects.map(e => e.type)).forEach(type => {
            map[type] = [];
        });

        for (const id of idObjects) {
            map[id.type] = _.concat(map[id.type], id.id);
        }

        logger.debug(`labels.service: getIdsTypeMapByLabels: out: ${JSON.stringify(map)}`);

        return map;

    }

    public async getIdsCategoryMapByLabels(labels: string[]): Promise<PropertyArrayMap> {
        logger.debug(`labels.service: getIdsCategoryMapByLabels: in: labels:${labels}`);

        const map:PropertyArrayMap = {};
        const idObjects = await this.labelsDao.listIdObjectsByLabels(labels);

        if(idObjects && idObjects.length === 0) {
            return undefined;
        }

        _.uniq(idObjects.map(id => id.category)).forEach(type => {
            map[type] = [];
        });

        for (const idObject of idObjects) {
            map[idObject.category] = _.concat(map[idObject.category], idObject.id);
        }

        logger.debug(`labels.service: getIdsCategoryMapByLabels: out: ${JSON.stringify(map)}`);

        return map;
    }

}

export interface PropertyArrayMap {
    [key: string]: string[];
}
