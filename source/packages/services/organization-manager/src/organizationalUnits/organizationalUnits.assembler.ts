/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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

import { logger } from '@awssolutions/simple-cdf-logger';
import { injectable } from 'inversify';
import { OrganizationalUnitItem, OrganizationalUnitResource } from './organizationalUnits.model';

@injectable()
export class OrganizationalUnitsAssembler {
    public toResourceList(items: OrganizationalUnitItem[]): OrganizationalUnitResource[] {
        logger.debug(
            `organizationalUnit.assembler toResourceList: in: item:${JSON.stringify(items)}`,
        );
        const resourcelist = items.map((r) => this.toResource(r));
        logger.debug(
            `organizationalUnit.assembler toResourceList: out: ${JSON.stringify(resourcelist)}`,
        );
        return resourcelist;
    }

    public toResource(item: OrganizationalUnitItem): OrganizationalUnitResource {
        logger.debug(`organizationalUnit.assembler toResource: in: item:${JSON.stringify(item)}`);
        const { id, name, createdAt } = item;

        const resource: OrganizationalUnitResource = {
            id,
            name,
            createdAt: new Date(createdAt),
        };
        logger.debug(`organizationalUnit.assembler toResource: out: ${JSON.stringify(item)}`);
        return resource;
    }

    public toItem(resource: OrganizationalUnitResource): OrganizationalUnitItem {
        logger.debug(
            `organizationalUnit.assembler toResource: in: item:${JSON.stringify(resource)}`,
        );
        const { id, name, createdAt } = resource;

        const item: OrganizationalUnitItem = {
            id,
            name,
            createdAt: createdAt.toISOString(),
        };
        logger.debug(`organizationalUnit.assembler toResource: out: ${JSON.stringify(item)}`);
        return item;
    }
}
