/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger.util';
import { GroupResource, GroupItem, GroupResourceList, GroupItemList } from './groups.models';

@injectable()
export class GroupsAssembler {

    public fromResource(res: GroupResource): GroupItem {
        logger.debug(`groups.assembler fromResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`groups.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item = new GroupItem();

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });

        logger.debug(`groups.assembler fromResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public toResource(item: GroupItem): (GroupResource) {
        logger.debug(`groups.assembler toResource: in: item: ${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`groups.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = new GroupResource();

        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`groups.assembler toResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toResourceList(items:GroupItemList): GroupResourceList {
        logger.debug(`groups.assembler toResourceList: in: items:${JSON.stringify(items)}`);

        const list:GroupResourceList= {
            groups:[],
            pagination: items.pagination
        };

        items.groups.forEach(i=> list.groups.push(this.toResource(i)));

        logger.debug(`groups.assembler toResourceList: exit: ${JSON.stringify(list)}`);
        return list;

    }

    public fromResourceList(list:GroupResourceList): GroupItemList {
        logger.debug(`groups.assembler fromResourceList: in: list:${JSON.stringify(list)}`);

        const items:GroupItemList= {
            groups:[],
            pagination: list.pagination
        };

        list.groups.forEach(i=> items.groups.push(this.fromResource(i)));

        logger.debug(`groups.assembler fromResourceList: exit: ${JSON.stringify(items)}`);
        return items;

    }
}
