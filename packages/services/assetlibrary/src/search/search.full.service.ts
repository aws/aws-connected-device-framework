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
import { GroupItem } from '../groups/groups.models';
import { DeviceItem } from '../devices/devices.models';
import {TypeCategory} from '../types/constants';
import { SearchService } from './search.service';
import { Claims } from '../authz/claims';

@injectable()
export class SearchServiceFull implements SearchService {

    private readonly DEFAULT_SEARCH_COUNT=200;

    constructor( @inject(TYPES.SearchDao) private searchDao: SearchDaoFull,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject('authorization.enabled') private isAuthzEnabled: boolean) {}

    public async search(model: SearchRequestModel, offset?:number, count?:number): Promise<[(GroupItem|DeviceItem)[],number,number]> {
        logger.debug(`search.full.service search: in: model: ${JSON.stringify(model)}, offset:${offset}, count:${count}`);

        // TODO: validation

        // all ids must be lowercase
        this.setIdsToLowercase(model);

        // default pagination
        if (count===undefined) {
            count=this.DEFAULT_SEARCH_COUNT;
        }
        if (offset===undefined) {
            offset=0;
        }

        const authorizedPaths = this.getAuthorizedPaths();

        const models: (GroupItem|DeviceItem)[] = [];
        const results = await this.searchDao.search(model, authorizedPaths, offset, count);

        if (results===undefined || results.length===0) {
            count=0;
            logger.debug(`search.full.service search: exit: models: undefined, offset:${offset}, count:${count}`);
            return [undefined, offset, count];
        }

        for(const r of results) {
            if (r.types.indexOf(TypeCategory.Group)>=0) {
                models.push(this.groupsAssembler.toGroupItem(r));
            } else {
                models.push(this.devicesAssembler.toDeviceItem(r));
            }
        }

        if (models.length<count) {
            count=models.length;
        }

        logger.debug(`search.full.service search: exit: models: ${JSON.stringify(models)}, offset:${offset}, count:${count}`);
        return [models,offset,count];

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
        let authorizedPaths:string[];
        if (this.isAuthzEnabled) {
            authorizedPaths = Claims.getInstance().listPaths();
        }
        return authorizedPaths;
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
