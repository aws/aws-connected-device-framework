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
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { ComponentsDao } from './components.dao';
import ow from 'ow';
import { BulkComponentsResult, ComponentResource, ComponentResourceList } from './components.model';
import { OrganizationalUnitsService } from '../organizationalUnits/organizationalUnits.service';

@injectable()
export class ComponentsService {

    constructor(
        @inject(TYPES.ComponentsDao) private componentsDao: ComponentsDao,
        @inject(TYPES.OrganizationalUnitsService) private organizationalUnitService: OrganizationalUnitsService

    ) {
    }

    public async createBulk(organizationalUnitId: string, componentsResource: ComponentResource[]): Promise<BulkComponentsResult> {
        logger.info(`components.service createComponents in: organizationalUnitId: ${organizationalUnitId} componentsResource: ${JSON.stringify(componentsResource)}`)

        ow(organizationalUnitId, ow.string.nonEmpty)
        ow(componentsResource, ow.array.nonEmpty)

        const organizationalUnit = await this.organizationalUnitService.getOrganizationalUnit(organizationalUnitId)

        if (!organizationalUnit) {
            throw new Error(`Organizational Unit ${organizationalUnitId} does not exists`)
        }

        let success = 0;
        let failed = 0;
        const errors: { [key: string]: string } = {};
        for (const component of componentsResource) {
            try {
                await this.createComponent(organizationalUnitId, component)
                success++;
            } catch (err) {
                errors[`${component.name}`] = err;
                failed++;
            }
        }

        const response = {
            success,
            failed,
            total: success + failed,
            errors
        };
        logger.info(`components.service createComponents exit:`)
        return response;
    }

    public async createComponent(organizationalUnitId: string, componentResource: ComponentResource): Promise<void> {
        logger.info(`components.service createComponent in: organizationalUnitId: ${organizationalUnitId} componentResource: ${JSON.stringify(componentResource)}`)

        ow(organizationalUnitId, ow.string.nonEmpty)
        ow(componentResource.description, ow.string.nonEmpty)
        ow(componentResource.name, ow.string.nonEmpty)
        ow(componentResource.runOrder, ow.number.integer)
        ow(componentResource.resourceFile, ow.string.nonEmpty)
        ow(componentResource.parameters, ow.object.nonEmpty)

        await this.componentsDao.createComponent({
            ...componentResource,
            organizationalUnitId
        })

        logger.info(`component.service createComponent exit:`)
    }

    public async listComponents(ouName: string): Promise<ComponentResourceList> {
        logger.info(`components.service listComponents in: ouName: ${ouName}`)
        const componentItems = await this.componentsDao.getComponentsByOu(ouName)

        const componentResourceList = componentItems.map(item => {
            return {
                ...item,
                ouName
            }
        })

        logger.info(`components.service listComponents exit: componentResourceList: ${JSON.stringify(componentResourceList)}`)
        return componentResourceList
    }

    public async deleteBulk(organizationalUnitId: string): Promise<void> {
        logger.info(`components.service deleteBulk in: organizationalUnitId: ${organizationalUnitId}`)
        ow(organizationalUnitId, ow.string.nonEmpty)
        await this.componentsDao.deleteComponentsByOu(organizationalUnitId)
        logger.info(`components.service deleteBulk exit:`)
    }

    public async getBulk(organizationalUnitId: string): Promise<ComponentResource[]> {
        logger.info(`components.service getBulk in: organizationalUnitId: ${organizationalUnitId}`)

        ow(organizationalUnitId, ow.string.nonEmpty)

        const componentItemList = await this.componentsDao.getComponentsByOu(organizationalUnitId)
        const componentResourceList = componentItemList.map(componentItem => {
            const { organizationalUnitId, ...component } = componentItem;
            return component;

        })

        logger.info(`components.service getBulk out: componentResourceList: ${JSON.stringify(componentResourceList)}`)
        return componentResourceList;
    }
}