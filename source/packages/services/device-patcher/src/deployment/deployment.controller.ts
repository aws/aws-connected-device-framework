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
import {Response} from 'express';
import {inject} from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    httpPatch,
    interfaces,
    queryParam,
    requestBody,
    requestParam,
    response
} from 'inversify-express-utils';

import {handleError} from '../utils/errors';
import {logger} from '../utils/logger.util';

import {TYPES} from '../di/types';
import {DeploymentService} from './deployment.service';
import {DeploymentAssembler} from './deployment.assembler';
import {DeploymentResource} from './deployment.model';


@controller('')
export class DeploymentController implements interfaces.Controller {

    public constructor(
        @inject(TYPES.DeploymentService) private deploymentService: DeploymentService,
        @inject(TYPES.DeploymentAssembler) private deploymentAssembler: DeploymentAssembler,
    ) {}

    @httpGet('/deployments/:deploymentId')
    public async getDeployment(
        @response() res: Response,
        @requestParam('deploymentId') deploymentId: string,
    ): Promise<DeploymentResource> {
        logger.debug(`Deployment.controller getDeployment: in: deploymentId: ${deploymentId}`);

        let deploymentResource: DeploymentResource;

        try {
           deploymentResource = await this.deploymentService.get(deploymentId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller getDeployment: exit: ${JSON.stringify(deploymentResource)}`);

        return deploymentResource;

    }

    @httpGet('/devices/:deviceId/deployments')
    public async listDeployments(
        @response() res: Response,
        @requestParam('deviceId') deviceId: string,
        @queryParam('deploymentStatus') deploymentStatus: string,
        @queryParam('count') count: number,
        @queryParam('exclusiveStartToken') exclusiveStartToken: string,
    ): Promise<void> {
        logger.debug(`Deployment.controller getDeployment: in: deviceId: ${deviceId}`);

        try {
            const [items, paginationKey] = await this.deploymentService.listDeploymentsByDeviceId(deviceId, deploymentStatus, count, {nextToken: exclusiveStartToken});
            const resources = this.deploymentAssembler.toListResource(items, count, paginationKey);
            logger.debug(`Deployment.controller getDeployment: exit: ${JSON.stringify(resources)}`);

            res.status(200).send(resources);
        } catch (err) {
            handleError(err, res);
        }
    }

    @httpDelete('/deployments/:deploymentId')
    public async deleteDeployment(
        @requestParam('deploymentId') deploymentId: string,
        @response() res: Response
    ): Promise<void> {

        logger.debug(`Deployment.controller deleteDeployment: in: deploymentId: ${deploymentId}`);

        try {
            await this.deploymentService.delete(deploymentId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller delete: exit:}`);
    }

    @httpPatch('/deployments/:deploymentId')
    public async patchDeployment(
        @requestParam('deploymentId') deploymentId: string,
        @requestBody() req: DeploymentResource,
        @response() res: Response
    ): Promise<void> {
        logger.debug(`Deployment.controller patchDeployment: in: deploymentId: ${deploymentId}`);

        try {
            await this.deploymentService.retry(deploymentId, req);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Deployment.controller patch: exit:}`);
    }

}
