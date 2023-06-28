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
import { controller, interfaces, response, requestParam, requestBody, httpPost, httpGet, httpDelete } from 'inversify-express-utils';
import { ComponentsService } from './components.service';
import { inject } from 'inversify';
import { TYPES } from '../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';
import { BulkComponentsResource, BulkComponentsResult, ComponentResource } from './components.model';
import { handleError } from '../utils/errors';
import { Response } from 'express';

@controller('')
export class BulkComponentsController implements interfaces.Controller {

    constructor(@inject(TYPES.ComponentsService) private componentsService: ComponentsService) {
    }

    @httpPost('/organizationalUnits/:organizationalUnitId/bulkcomponents')
    public async bulkCreateComponents(@requestParam('organizationalUnitId') organizationalUnitId: string, @requestBody() bulkComponentsResource: BulkComponentsResource, @response() res: Response): Promise<BulkComponentsResult> {
        logger.info(`bulkComponents.controller  bulkCreateComponents: in: components:${JSON.stringify(bulkComponentsResource)}`);
        try {
            const result = await this.componentsService.createBulk(organizationalUnitId, bulkComponentsResource.components);
            res.status(201);
            return result;
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpGet('/organizationalUnits/:organizationalUnitId/bulkcomponents')
    public async bulkGetComponents(@requestParam('organizationalUnitId') organizationalUnitId: string, @response() res: Response): Promise<ComponentResource[]> {
        logger.info(`bulkComponents.controller  bulkGetComponents: in: ouName:${organizationalUnitId}`);
        try {
            const resources = await this.componentsService.getBulk(organizationalUnitId);
            res.status(200);
            return resources;
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpDelete('/organizationalUnits/:organizationalUnitId/bulkcomponents')
    public async bulkDeleteComponents(@requestParam('organizationalUnitId') organizationalUnitId: string, @response() res: Response): Promise<void> {
        logger.info(`bulkComponents.controller  bulkGetComponents: in: ouName:${organizationalUnitId}`);
        try {
            await this.componentsService.deleteBulk(organizationalUnitId);
            res.status(204);
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }


}