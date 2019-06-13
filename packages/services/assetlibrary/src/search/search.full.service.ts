/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { SearchRequestModel, FacetResults} from './search.models';
import { TYPES } from '../di/types';
import { SearchDaoFull} from './search.full.dao';
import {logger} from '../utils/logger';
import {GroupsAssembler} from '../groups/groups.assembler';
import {DevicesAssembler} from '../devices/devices.assembler';
import { GroupModel } from '../groups/groups.models';
import { DeviceModel } from '../devices/devices.models';
import {TypeCategory} from '../types/constants';
import { SearchService } from './search.service';

@injectable()
export class SearchServiceFull implements SearchService {

    constructor( @inject(TYPES.SearchDao) private searchDao: SearchDaoFull,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler) {}

    public async search(model: SearchRequestModel, offset?:number, count?:number): Promise<(GroupModel|DeviceModel)[]> {
        logger.debug(`search.full.service search: in: model: ${JSON.stringify(model)}, offset:${offset}, count:${count}`);

        // TODO: validation

        // all ids must be lowercase
        this.setIdsToLowercase(model);

        const models: (GroupModel|DeviceModel)[] = [];
        const results = await this.searchDao.search(model, offset, count);

        if (results===undefined) {
            logger.debug('search.full.service search: exit: models: undefined');
            return undefined;
        }

        for(const r of results) {
            if (r.types.indexOf(TypeCategory.Group)>=0) {
                models.push(this.groupsAssembler.toGroupModel(r));
            } else {
                models.push(this.devicesAssembler.toDeviceModel(r));
            }
        }

        logger.debug(`search.full.service search: exit: models: ${JSON.stringify(models)}`);
        return models;

    }

    public async facet(model: SearchRequestModel): Promise<FacetResults> {
        logger.debug(`search.full.service facet: in: model: ${JSON.stringify(model)}`);

        // TODO: validation?

        // all ids must be lowercase
        this.setIdsToLowercase(model);

        const facets = await this.searchDao.facet(model);
        logger.debug(`search.full.service facet: exit: models: ${facets}`);
        return facets;

    }

    public async summary(model: SearchRequestModel): Promise<number> {
        logger.debug(`search.full.service summary: in: model: ${JSON.stringify(model)}`);

        // TODO: validation?

        // all ids must be lowercase
        this.setIdsToLowercase(model);

        const total = await this.searchDao.summary(model);
        logger.debug(`search.full.service summary: exit: models: ${total}`);
        return total;

    }

    private setIdsToLowercase(model:SearchRequestModel) {
        if (model.types) {
            model.types = model.types.map(v => v.toLowerCase());
        }
        if (model.ancestorPath) {
            model.ancestorPath = model.ancestorPath.toLowerCase();
        }
        if (model.eq) {
            model.eq.forEach(f=> {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
        if (model.neq) {
            model.neq.forEach(f=> {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
        if (model.startsWith) {
            model.startsWith.forEach(f=> {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
        if (model.endsWith) {
            model.endsWith.forEach(f=> {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
        if (model.contains) {
            model.contains.forEach(f=> {
                if (this.isIdAttribute(f.field)) {
                    f.value = (<string>f.value).toLowerCase();
                }
            });
        }
    }

    private isIdAttribute(name:string): boolean {
        return (name==='deviceId' || name==='groupPath' || name==='templateId');
    }

}
