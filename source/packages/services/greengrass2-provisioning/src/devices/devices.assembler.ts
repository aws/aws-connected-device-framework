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

import { logger } from '@awssolutions/simple-cdf-logger';
import { DeviceItem, DeviceResource } from './devices.model';

@injectable()
export class DevicesAssembler {
    public toResource(item: DeviceItem): DeviceResource {
        logger.debug(`devices.assembler toResource: in: item:${JSON.stringify(item)}`);

        const resource: DeviceResource = {
            name: item.name,
            coreName: item.coreName,
            provisioningTemplate: item.provisioningTemplate,
            provisioningParameters: item.provisioningParameters,
            cdfProvisioningParameters: item.cdfProvisioningParameters,
            taskStatus: item.taskStatus,
            statusMessage: item.statusMessage,
            artifacts: item.artifacts,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };

        logger.debug(`devices.assembler toResource: exit:${JSON.stringify(resource)}`);
        return resource;
    }

    public toResourceArray(items: DeviceItem[]): DeviceResource[] {
        logger.debug(`devices.assembler toResourceArray: in: items:${JSON.stringify(items)}`);

        const reources: DeviceResource[] = [];

        if ((items?.length ?? 0) > 0) {
            items.forEach((i) => reources.push(this.toResource(i)));
        }

        logger.debug(`devices.assembler toResourceArray: exit: ${JSON.stringify(reources)}`);
        return reources;
    }
}
