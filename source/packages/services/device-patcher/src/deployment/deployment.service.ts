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
import ow from 'ow';
import {v1 as uuid} from 'uuid';
import {inject, injectable} from 'inversify';


import {TYPES} from '../di/types';
import {logger} from '../utils/logger.util';

import {DeploymentDao} from './deployment.dao';
import {DeploymentManager} from './deployment.manager';
import {DeploymentItem, DeploymentStatus, DeploymentType,} from './deployment.model';

import {DeploymentListPaginationKey} from './deploymentTask.dao';

@injectable()
export class DeploymentService {

    constructor(
        @inject(TYPES.DeploymentDao) private deploymentDao: DeploymentDao,
        @inject(TYPES.DeploymentManager) private deploymentManager: DeploymentManager
    ) {}

    public async createBulk(deployments: DeploymentItem[]): Promise<void> {
        logger.debug(`DeploymentService.createDeployment: in: deployment: ${JSON.stringify(deployments)}`);

        ow(deployments, ow.array.nonEmpty);

        for (const deployment of deployments) {

            deployment.deploymentId = uuid()
            deployment.createdAt = new Date()
            deployment.updatedAt = deployment.createdAt
            deployment.deploymentStatus = DeploymentStatus.CREATED

            if(!deployment.deploymentType) {
                deployment.deploymentType = DeploymentType.AGENTBASED
            }

            try {
                await this.deploymentManager.create(deployment.deploymentType, deployment);
            } catch (err) {
                logger.error(`deployment.service deploymentManager.create: err: ${err}`);

                deployment.deploymentStatus = DeploymentStatus.FAILED;
                if(err.message) {
                    deployment.statusMessage = err.message;
                } else if (err.code) {
                    deployment.statusMessage = err.code;
                }

            }
        }

        await this.deploymentDao.saveBatches(deployments);

        logger.debug(`DeploymentService.createDeployment out: exit`);
    }

    public async deploy(deployment: DeploymentItem): Promise<void> {
        logger.debug(`DeploymentService.deploy: in: deployment: ${JSON.stringify(deployment)}`);

        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentTemplateName, ow.string.nonEmpty);
        ow(deployment.deploymentType, ow.string.nonEmpty);

        try {
            await this.deploymentManager.deploy(deployment.deploymentType, deployment);
        } catch (err) {
            logger.error(`deployment.service deploymentTemplatesDao.get: err: ${err}`);

            deployment.deploymentStatus = DeploymentStatus.FAILED;
            if(err.message) {
                deployment.statusMessage = err.message;
            } else if (err.code) {
                deployment.statusMessage = err.code;
            }

        }

        await this.deploymentDao.update(deployment);

        logger.debug(`DeploymentService.deploy exit:`);
    }

    public async get(deploymentId:string): Promise<DeploymentItem> {
        logger.debug(`DeploymentService get: in: deploymentId: ${deploymentId}`);

        ow(deploymentId, 'Deployment Id', ow.string.nonEmpty);

        const deployment = await this.deploymentDao.get(deploymentId);

        logger.debug(`deployment.service getDeploymentByDeviceId: exit: deployment: ${JSON.stringify(deployment)}`);
        return deployment;
    }

    public async listDeploymentsByDeviceId(deviceId: string, status?: string, count?:number, exclusiveStartKey?:DeploymentListPaginationKey): Promise<[DeploymentItem[], DeploymentListPaginationKey]> {
        logger.debug(`DeploymentService listDeploymentsByDeviceId: in: deviceId: ${deviceId}`);

        ow(deviceId, 'Device Id', ow.string.nonEmpty);

        let deployments;
        try {
            deployments = await this.deploymentDao.list(deviceId, status, count, exclusiveStartKey);
        } catch (err) {
            logger.error(`deployment.service deploymentDao.list: err: ${err}`);
            throw err;
        }

        logger.debug(`deployment.service listDeploymentsByDeviceId: exit: deployment: ${JSON.stringify(deployments)}`);
        return deployments;
    }

    public async delete(deploymentId:string): Promise<void> {
        logger.debug(`deployment.service delete: in: deploymentId: ${deploymentId}`);

        ow(deploymentId, 'Deployment Id', ow.string.nonEmpty);

        const deployment = await this.get(deploymentId);

        if (!deployment) {
           throw new Error('NOT_FOUND') ;
        }

        let result;
        if (deployment.deploymentType) {
            try {
                result = await this.deploymentManager.delete(deployment.deploymentType, deployment);
            } catch (err) {
                logger.error(`deployment.service deploymentManager.delete: err: ${err}`);
                throw err;
            }
        }

        await this.deploymentDao.delete(deploymentId);

        logger.debug(`deployment.service delete out: result: ${JSON.stringify(result)}`);

    }

    public async update(deployment: DeploymentItem): Promise<void> {
        logger.debug(`deployment.service updateByDeviceId: in: deployment: ${JSON.stringify(deployment)}`);

        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deployment.deviceId, 'Device Id', ow.string.nonEmpty);

        const existingDeployment = await this.get(deployment.deploymentId);

        if (!existingDeployment) {
            throw new Error('NOT_FOUND') ;
        }

        Object.assign(existingDeployment, deployment);

        try {
            await this.deploymentDao.update(existingDeployment);
        } catch (err) {
            logger.error(`deployment.service deploymentDao.update: err: ${err}`);
            throw err;
        }

        logger.debug(`deployment.service updateByDeviceId: exit:`);

    }

    public async retry(deploymentId:string, deployment: DeploymentItem): Promise<void> {
        logger.debug(`deployment.service patch: in: deploymentId: ${JSON.stringify(deployment)}`);

        ow(deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentStatus, 'Deployment Status', ow.string.nonEmpty);

        if(deployment.deploymentStatus !== DeploymentStatus.RETRY) {
            throw new Error('UNSUPPORTED_DEPLOYMENT_STATUS')
        }

        const existingDeployment = await this.get(deploymentId);

        if (!existingDeployment) {
            throw new Error('NOT_FOUND') ;
        }

        Object.assign(existingDeployment, deployment);

        let result;
        try {
            result = await this.deploymentManager.update(existingDeployment.deploymentType, existingDeployment);
        } catch (e) {
            logger.error(`deployment.service deploymentManager.retry: err: ${e}`);
            deployment.deploymentStatus = DeploymentStatus.FAILED;
            if(e.message) {
                deployment.statusMessage = e.message;
            } else if (e.code) {
                deployment.statusMessage = e.code;
            }
        }
        deployment.statusMessage = "";
        await this.deploymentDao.update(existingDeployment);

        logger.debug(`deployment.service patch out: result: ${JSON.stringify(result)}`);
    }

}
