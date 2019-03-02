/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { SearchRequestModel} from './search.models';
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

        // TODO validation?

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
            } else if (r.types.indexOf(TypeCategory.Device)>=0) {
                models.push(this.devicesAssembler.toDeviceModel(r));
            }
        }

        logger.debug(`search.full.service search: exit: models: ${JSON.stringify(models)}`);
        return models;

    }

    public async summary(model: SearchRequestModel): Promise<number> {
        logger.debug(`search.full.service summary: in: model: ${JSON.stringify(model)}`);

        // TODO validation?

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
            Object.keys(model.eq).forEach(k => {
                if (this.isIdAttribute(k)) {
                    model.eq[k] = (<string>model.eq[k]).toLowerCase();
                }
            });
        }
        if (model.neq) {
            Object.keys(model.neq).forEach(k => {
                if (this.isIdAttribute(k)) {
                    model.neq[k] = (<string>model.neq[k]).toLowerCase();
                }
            });
        }
        if (model.startsWith) {
            Object.keys(model.startsWith).forEach(k => {
                if (this.isIdAttribute(k)) {
                    model.startsWith[k] = (<string>model.startsWith[k]).toLowerCase();
                }
            });
        }
        if (model.endsWith) {
            Object.keys(model.endsWith).forEach(k => {
                if (this.isIdAttribute(k)) {
                    model.endsWith[k] = (<string>model.endsWith[k]).toLowerCase();
                }
            });
        }
        if (model.contains) {
            Object.keys(model.contains).forEach(k => {
                if (this.isIdAttribute(k)) {
                    model.contains[k] = (<string>model.contains[k]).toLowerCase();
                }
            });
        }
    }

    private isIdAttribute(name:string): boolean {
        return (name==='deviceId' || name==='groupPath' || name==='templateId');
    }

}
