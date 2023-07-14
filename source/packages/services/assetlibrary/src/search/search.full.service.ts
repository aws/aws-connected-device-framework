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
import { Claims } from '../authz/claims';
import { owCheckOptionalNumber } from '../utils/inputValidation.util';
import { DevicesAssembler } from '../devices/devices.assembler';
import { DeviceItem } from '../devices/devices.models';
import { TYPES } from '../di/types';
import { GroupsAssembler } from '../groups/groups.assembler';
import { GroupItem } from '../groups/groups.models';
import { TypeCategory } from '../types/constants';
import { logger } from '@awssolutions/simple-cdf-logger';
import { SearchDaoFull } from './search.full.dao';
import { FacetResults, SearchRequestModel } from './search.models';
import { SearchService } from './search.service';

@injectable()
export class SearchServiceFull implements SearchService {
    private readonly DEFAULT_SEARCH_COUNT = 200;

    constructor(
        @inject(TYPES.SearchDao) private searchDao: SearchDaoFull,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject('authorization.enabled') private isAuthzEnabled: boolean,
    ) {}

    public async search(
        model: SearchRequestModel,
    ): Promise<[(GroupItem | DeviceItem)[], number, number]> {
        logger.debug(`search.full.service search: in: model: ${JSON.stringify(model)}`);

        // TODO: validation
        owCheckOptionalNumber(model.count, 1, 10000, 'count');
        owCheckOptionalNumber(model.offset, 0, Number.MAX_SAFE_INTEGER, 'offset');

        // all ids must be lowercase
        this.setIdsToLowercase(model);

        // default pagination
        if (model.count === undefined) {
            model.count = this.DEFAULT_SEARCH_COUNT;
        }
        if (model.offset === undefined) {
            model.offset = 0;
        }

        const authorizedPaths = this.getAuthorizedPaths();

        const models: (GroupItem | DeviceItem)[] = [];
        const results = await this.searchDao.search(model, authorizedPaths);

        if (results === undefined || results.length === 0) {
            model.count = 0;
            logger.debug(
                `search.full.service search: exit: models: undefined, offset:${model.offset}, count:${model.count}`,
            );
            return [undefined, model.offset, model.count];
        }

        for (const r of results) {
            if (r.types.indexOf(TypeCategory.Group) >= 0) {
                models.push(this.groupsAssembler.toGroupItem(r));
            } else {
                models.push(this.devicesAssembler.toDeviceItem(r));
            }
        }

        if (models.length < model.count) {
            model.count = models.length;
        }

        logger.debug(
            `search.full.service search: exit: models: ${JSON.stringify(models)}, offset:${
                model.offset
            }, count:${model.count}`,
        );
        return [models, model.offset, model.count];
    }

    public async facet(model: SearchRequestModel): Promise<FacetResults> {
        logger.debug(`search.full.service facet: in: model: ${JSON.stringify(model)}`);

        // TODO: validation?

        // all ids must be lowercase
        this.setIdsToLowercase(model);

        const authorizedPaths = this.getAuthorizedPaths();

        const facets = await this.searchDao.facet(model, authorizedPaths);
        logger.debug(`search.full.service facet: exit: models: ${facets}`);
        return facets;
    }

    public async delete(model: SearchRequestModel): Promise<void> {
        logger.debug(`search.full.service delete: in: model: ${JSON.stringify(model)}`);
        const authorizedPaths = this.getAuthorizedPaths();
        await this.searchDao.delete(model, authorizedPaths);
    }

    public async summary(model: SearchRequestModel): Promise<number> {
        logger.debug(`search.full.service summary: in: model: ${JSON.stringify(model)}`);

        // TODO: validation?

        // all ids must be lowercase
        this.setIdsToLowercase(model);

        const authorizedPaths = this.getAuthorizedPaths();

        const total = await this.searchDao.summary(model, authorizedPaths);
        logger.debug(`search.full.service summary: exit: models: ${total}`);
        return total;
    }

    private getAuthorizedPaths() {
        let authorizedPaths: string[];
        if (this.isAuthzEnabled) {
            authorizedPaths = Claims.getInstance().listPaths();
        }
        return authorizedPaths;
    }

    private setIdsToLowercase(model: SearchRequestModel) {
        if (model.types) {
            model.types = model.types.map((v) => v.toLowerCase());
        }
        if (model.ancestorPath) {
            model.ancestorPath = model.ancestorPath.toLowerCase();
        }
        if (model.eq) {
            model.eq.forEach((f) => {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
        if (model.neq) {
            model.neq.forEach((f) => {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
        if (model.startsWith) {
            model.startsWith.forEach((f) => {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
        if (model.endsWith) {
            model.endsWith.forEach((f) => {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
        if (model.contains) {
            model.contains.forEach((f) => {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
    }

    private isIdAttribute(name: string): boolean {
        return name === 'deviceId' || name === 'groupPath' || name === 'templateId';
    }
}
