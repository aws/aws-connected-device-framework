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

        // special hanlding aroung provisoningParameters/provisioningParameters
        item.provisioningParameters = res.provisoningParameters ?? res.provisioningParameters;

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
