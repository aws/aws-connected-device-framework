/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import ow from 'ow';
import { v1 as uuid } from 'uuid';
import { inject, injectable } from 'inversify';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';

import { DeploymentDao } from './deployment.dao';
import { DeploymentManager } from './deployment.manager';
import { DeploymentModel, DeploymentRequest, DeploymentStatus } from './deployment.model';

import { DeploymentTemplatesDao } from '../templates/template.dao';
import { DeploymentTemplateModel } from '../templates/template.model';

@injectable()
export class DeploymentService {

    constructor(
        @inject(TYPES.DeploymentDao) private deploymentDao: DeploymentDao,
        @inject(TYPES.DeploymentManager) private deploymentManager: DeploymentManager,
        @inject(TYPES.DeploymentTemplateDao) private deploymentTemplatesDao: DeploymentTemplatesDao
    ) {}

    public async create(deploymentRequest: DeploymentRequest): Promise<string> {
        logger.debug(`DeploymentService.createDeployment: in: deployment: ${JSON.stringify(deploymentRequest)}`);

        ow(deploymentRequest, 'Deployment Information', ow.object.nonEmpty);
        ow(deploymentRequest.deploymentTemplateName, ow.string.nonEmpty);
        ow(deploymentRequest.deviceId, ow.string.nonEmpty);

        // whitelist device before creating a deployment
        if(await this.deploymentDao.isDeviceWhitelisted(deploymentRequest.deviceId) !== true) {
            throw new Error('DEVICE_NOT_WHITELISTED');
        }

        // Get the deployment template for the deployment
        let template:DeploymentTemplateModel;
        try {
            template = await this.deploymentTemplatesDao.get(deploymentRequest.deploymentTemplateName);
        } catch (err) {
            throw new Error('DEPLOYMENT_TEMPLATE_NOT_FOUND');
        }

        if(!template) {
            throw new Error('DEPLOYMENT_TEMPLATE_NOT_FOUND');
        }

        const deployment: DeploymentModel = {
            deviceId: deploymentRequest.deviceId,
            deploymentId: uuid(),
            deploymentTemplateName: deploymentRequest.deploymentTemplateName,
            deploymentStatus: DeploymentStatus.CREATED,
            createdAt: new Date(),
            updatedAt: new Date(),
            deploymentTemplate: template,
            deploymentType: template.type
        };

        let result;
        try {
            result = await this.deploymentManager.create(deployment);
        } catch (err) {
            logger.error(`deployment.service deploymentManager.create: err: ${err}`);
            throw new Error(err);
        }

        await this.deploymentDao.save(deployment);

        logger.debug(`DeploymentService.createDeployment out: result: ${JSON.stringify(result)}`);

        return deployment.deploymentId;
    }

    public async deploy(deployment: DeploymentModel) {
        logger.debug(`DeploymentService.deploy: in: deployment: ${JSON.stringify(deployment)}`);

        deployment.deploymentStatus = DeploymentStatus.PENDING;

        // Get the deployment template for the deployment
        let template:DeploymentTemplateModel;
        try {
            template = await this.deploymentTemplatesDao.get(deployment.deploymentTemplateName);
        } catch (err) {
            logger.error(`deployment.service deploymentTemplatesDao.get: err: ${err}`);
            deployment.deploymentStatus = DeploymentStatus.FAILED;
        }

        if(!template) {
            throw new Error('DEPLOYMENT_TEMPLATE_NOT_FOUND');
        }

        // inject the template into the deployment model
        deployment.deploymentTemplate = template;

        let result;
        try {
            result = await this.deploymentManager.deploy(deployment);
        } catch (err) {
            logger.error(`deployment.service deploymentManager.deploy: err: ${err}`);
            deployment.deploymentStatus = DeploymentStatus.FAILED;
        }

        await this.deploymentDao.update(deployment);

        logger.debug(`DeploymentService.deploy out: result: ${JSON.stringify(result)}`);

        return result;
    }

    public async get(deploymentId:string, deviceId: string): Promise<any> {
        logger.debug(`DeploymentService getDeploymentByDeviceId: in: deviceId: ${deviceId}`);

        const deployment = await this.deploymentDao.get(deploymentId, deviceId);

        logger.debug(`deployment.service getDeploymentByDeviceId: exit: deployment: ${JSON.stringify(deployment)}`);
        return deployment;

    }

    public async listDeploymentsByDeviceId(deviceId: string, status?: string): Promise<any> {
        logger.debug(`DeploymentService getDeploymentByDeviceId: in: deviceId: ${deviceId}`);

        let deployments;
        try {
            deployments = await this.deploymentDao.list(deviceId, status);
        } catch (err) {
            logger.error(`deployment.service deploymentDao.list: err: ${err}`);
            throw new Error(err);
        }

        logger.debug(`deployment.service getDeploymentByDeviceId: exit: deployment: ${JSON.stringify(deployments)}`);
        return deployments;
    }

    public async update(deployment: DeploymentModel): Promise<void> {
        logger.debug(`deployment.service updateByDeviceId: in: deployment: ${JSON.stringify(deployment)}`);

        try {
            await this.deploymentDao.update(deployment);
        } catch (err) {
            logger.error(`deployment.service deploymentDao.update: err: ${err}`);
            throw new Error(err);
        }

        logger.debug(`deployment.service updateByDeviceId: exit:`);

    }

    public async delete(deploymentId:string, deviceId: string): Promise<void> {
        logger.debug(`deployment.service delete: in: deploymentId: ${deploymentId}, deviceId: ${deviceId}`);

        const deployment = await this.get(deploymentId, deviceId);

        if (!deployment) {
           throw new Error('NOT_FOUND') ;
        }

        deployment.deploymentTemplate = {
            type: deployment.deploymentType
        };

        let result;
        try {
            result = await this.deploymentManager.delete(deployment);
        } catch (err) {
            logger.error(`deployment.service deploymentManager.delete: err: ${err}`);
            throw new Error(err);
        }

        await this.deploymentDao.delete(deployment);

        logger.debug(`deployment.service delete out: result: ${JSON.stringify(result)}`);

    }

}
