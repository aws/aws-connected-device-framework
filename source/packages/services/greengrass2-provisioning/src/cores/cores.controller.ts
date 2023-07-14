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
import { Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpGet,
    interfaces,
    queryParam,
    requestParam,
    response,
} from 'inversify-express-utils';
import { DeploymentList } from '../deploymentTasks/deploymentTasks.models';
import { TYPES } from '../di/types';
import { handleError } from '../utils/errors.util';
import { logger } from '@awssolutions/simple-cdf-logger';
import { CoresAssembler } from './cores.assembler';
import { CoresService } from './cores.service';

@controller('')
export class CoresController implements interfaces.Controller {
    constructor(
        @inject(TYPES.CoresService) private coresService: CoresService,
        @inject(TYPES.CoresAssembler) private coresAssembler: CoresAssembler,
    ) {}

    @httpGet('/cores/:name')
    public async getCore(
        @requestParam('name') name: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(`cores.controller getCore: in: name:${name}`);

        try {
            const item = await this.coresService.get(name);
            if (item === undefined) {
                logger.debug(`cores.controller getCore: exit: 404`);
                res.status(404).send();
            } else {
                const resource = this.coresAssembler.toResource(item);
                logger.debug(`cores.controller getCore: exit: ${JSON.stringify(resource)}`);
                res.status(200).send(resource);
            }
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/cores/:coreName/deployments')
    public async listDeploymentsByCore(
        @requestParam('coreName') coreName: string,
        @queryParam('count') count: number,
        @queryParam('exclusiveStartTaskId') exclusiveStartTaskId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `cores.controller listDeploymentsByCore: in: coreName:${coreName}, count:${exclusiveStartTaskId}, exclusiveStartTaskId:${exclusiveStartTaskId}`,
        );

        try {
            const [items, paginationKey] = await this.coresService.listDeploymentsByCore(
                coreName,
                count,
                { taskId: exclusiveStartTaskId },
            );
            const result: DeploymentList = {
                deployments: items,
                pagination: {
                    count,
                    lastEvaluated: paginationKey,
                },
            };
            logger.debug(
                `cores.controller listDeploymentsByCore: exit: ${JSON.stringify(result)}`,
            );
            res.status(200).send(result);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/cores')
    public async listCores(
        @queryParam('templateName') templateName: string,
        @queryParam('templateVersion') templateVersion: number,
        @queryParam('failedOnly') failedOnly: boolean,
        @queryParam('count') count: number,
        @queryParam('exclusiveStartThingName') exclusiveStartThingName: string,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `cores.controller listCores: in: templateName:${templateName}, templateVersion:${templateVersion}, failedOnly:${failedOnly}, count:${count}, exclusiveStartThingName:${exclusiveStartThingName}`,
        );

        failedOnly = (failedOnly + '').toLowerCase() === 'true';
        try {
            const [items, paginationKey] = await this.coresService.list(
                templateName,
                templateVersion,
                failedOnly,
                count,
                { thingName: exclusiveStartThingName },
            );
            const resources = this.coresAssembler.toListResource(items, count, paginationKey);
            logger.debug(`cores.controller listTasks: exit: ${JSON.stringify(resources)}`);
            res.status(200).send(resources);
        } catch (e) {
            handleError(e, res);
        }
    }
}
