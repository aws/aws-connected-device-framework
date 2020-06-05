/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger.util';
import { DeviceResource, DeviceItem, DeviceResourceList, DeviceItemList } from './devices.models';

@injectable()
export class DevicesAssembler {

    public fromResource(res: DeviceResource): DeviceItem {
        logger.debug(`devices.assembler fromResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`devices.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item = new DeviceItem();

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });

        logger.debug(`devices.assembler fromResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public toResource(item: DeviceItem): (DeviceResource) {
        logger.debug(`devices.assembler toResource: in: item: ${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`devices.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = new DeviceResource();

        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`devices.assembler toResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toResourceList(items:DeviceItemList): DeviceResourceList {
        logger.debug(`devices.assembler toResourceList: in: items:${JSON.stringify(items)}`);

        const list:DeviceResourceList= {
            devices:[],
            pagination: items.pagination
        };

        items.devices.forEach(i=> list.devices.push(this.toResource(i)));

        logger.debug(`devices.assembler toResourceList: exit: ${JSON.stringify(list)}`);
        return list;

    }

    public fromResourceList(list:DeviceResourceList): DeviceItemList {
        logger.debug(`devices.assembler fromResourceList: in: list:${JSON.stringify(list)}`);

        const items:DeviceItemList= {
            devices:[],
            pagination: list.pagination
        };

        list.devices.forEach(i=> items.devices.push(this.fromResource(i)));

        logger.debug(`devices.assembler fromResourceList: exit: ${JSON.stringify(items)}`);
        return items;

    }
}
