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
import { DevicesAssembler } from '../devices/devices.assembler';
import { DeviceItem } from '../devices/devices.models';
import { TYPES } from '../di/types';
import { GroupsAssembler } from '../groups/groups.assembler';
import { GroupItem } from '../groups/groups.models';
import { TypeCategory } from '../types/constants';
import { NotSupportedError } from '../utils/errors';
import { logger } from '@awssolutions/simple-cdf-logger';
import { SearchDaoLite } from './search.lite.dao';
import { FacetResults, SearchRequestModel } from './search.models';

@injectable()
export class SearchServiceLite {
    private readonly DEFAULT_SEARCH_COUNT = 200;

    constructor(
        @inject(TYPES.SearchDao) private searchDao: SearchDaoLite,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler
    ) {}

    public async search(
        model: SearchRequestModel,
        offset?: string,
        count?: number
    ): Promise<[(GroupItem | DeviceItem)[], string, number]> {
        logger.debug(
            `search.lite.service search: in: model: ${JSON.stringify(
                model
            )}, offset:${offset}, count:${count}`
        );

        // validation
        ow(model, ow.object.nonEmpty);
        const type =
            model.types === undefined || model.types.length === 0
                ? undefined
                : model.types.filter((t) => t === TypeCategory.Device || t === TypeCategory.Group);
        ow(type, 'type', ow.object.nonEmpty);
        const someFiltersDefined: boolean =
            model.ancestorPath !== undefined ||
            model.eq !== undefined ||
            model.neq !== undefined ||
            model.lt !== undefined ||
            model.lte !== undefined ||
            model.gt !== undefined ||
            model.gte !== undefined ||
            model.startsWith !== undefined ||
            model.endsWith !== undefined ||
            model.contains !== undefined;
        ow(someFiltersDefined, ow.boolean.true);

        // default pagination
        if (count === undefined) {
            count = this.DEFAULT_SEARCH_COUNT;
        }

        const models: (GroupItem | DeviceItem)[] = [];
        const results = await this.searchDao.search(model, offset, count);

        if (results === undefined) {
            count = 0;
            logger.debug(
                `search.lite.service search: exit: models: undefined, offset:${offset}, count:${count}`
            );
            return [undefined, offset, count];
        }

        for (const r of results) {
            if (r.types.indexOf(TypeCategory.Group) >= 0) {
                models.push(this.groupsAssembler.toGroupItem(r));
            } else if (r.types.indexOf(TypeCategory.Device) >= 0) {
                models.push(this.devicesAssembler.toDeviceItem(r));
            }
        }

        if (models.length < count) {
            count = models.length;
        }

        logger.debug(`search.lite.service search: exit: models: ${JSON.stringify(models)}`);
        return [models, offset, count];
    }

    public async delete(model: SearchRequestModel): Promise<void> {
        logger.debug(`search.lite.service delete: in: model: ${JSON.stringify(model)}`);
        throw new NotSupportedError();
    }

    public async summary(model: SearchRequestModel): Promise<number> {
        logger.debug(`search.lite.service summary: in: model: ${JSON.stringify(model)}`);
        throw new NotSupportedError();
    }

    public async facet(model: SearchRequestModel): Promise<FacetResults> {
        logger.debug(`search.lite.service facet: in: model: ${JSON.stringify(model)}`);
        throw new NotSupportedError();
    }
}
