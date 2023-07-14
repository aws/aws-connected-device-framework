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
import {
    controller,
    httpDelete,
    httpGet,
    httpPost,
    interfaces,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';
import { Response } from 'express';
import { logger } from '@awssolutions/simple-cdf-logger';
import { handleError } from '../utils/errors';
import { inject } from 'inversify';
import { TYPES } from '../di/types';
import { OrganizationalUnitsService } from './organizationalUnits.service';
import { ComponentsService } from '../components/components.service';
import { OrganizationalUnitResource } from './organizationalUnits.model';

@controller('')
export class OrganizationalUnitsController implements interfaces.Controller {
    constructor(
        @inject(TYPES.OrganizationalUnitsService)
        private organizationsService: OrganizationalUnitsService,
        @inject(TYPES.ComponentsService) private componentsService: ComponentsService,
    ) {}

    @httpPost('/organizationalUnits')
    public async createOrganizationalUnit(
        @requestBody() model: OrganizationalUnitResource,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `organizations.controller createOrganizationalUnit: in: ouName: ${model.name}`,
        );
        try {
            const organizationalUnitId = await this.organizationsService.createOrganizationalUnit(
                model,
            );
            res.location(`/organizationalUnits/${organizationalUnitId}`)
                .header('x-organizationalUnitId', organizationalUnitId)
                .status(201)
                .send();
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/organizationalUnits')
    public async listOrganizationalUnits(@response() res: Response): Promise<void> {
        logger.info(`organizations.controller listOrganizationalUnits:`);
        try {
            const organizationalUnits = await this.organizationsService.listOrganizationalUnits();
            res.status(200).json(organizationalUnits);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/organizationalUnits/:id')
    public async deleteOrganizationalUnit(
        @requestParam('id') id: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(`organizations.controller deleteOrganizationalUnit: in: accountId: ${id}`);
        try {
            logger.info(
                `organizations.controller deleteOrganizationalUnit: delete components from organizational unit ${id}`,
            );
            await this.componentsService.deleteBulk(id);
            await this.organizationsService.deleteOrganizationalUnit(id);
            logger.debug(`organizations.controller deleteOrganizationalUnit: exit:`);
            res.status(204).send();
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpGet('/organizationalUnits/:id')
    public async getOrganizationalUnit(
        @requestParam('id') id: string,
        @response() res: Response,
    ): Promise<OrganizationalUnitResource> {
        logger.info(`organizations.controller getOrganizationalUnit: in: accountId: ${id}`);
        try {
            const model = await this.organizationsService.getOrganizationalUnit(id);
            logger.debug(`organizations.controller exit: ${JSON.stringify(model)}`);
            if (model === undefined) {
                res.status(404).send();
            } else {
                return model;
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }
}
