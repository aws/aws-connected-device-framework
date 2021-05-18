/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import ow from 'ow';
import {v1 as uuid} from 'uuid';
import {inject, injectable} from 'inversify';


import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {IotUtil} from '../utils/iot.util';

import {DeploymentDao} from './deployment.dao';
import {DeploymentManager} from './deployment.manager';
import {DeploymentList, DeploymentModel, DeploymentRequest, DeploymentStatus} from './deployment.model';

import {DeploymentTemplatesDao} from '../templates/template.dao';
import {DeploymentTemplateModel} from '../templates/template.model';

@injectable()
export class DeploymentService {

    constructor(
        @inject(TYPES.IotUtil) private iotUtil: IotUtil,
        @inject(TYPES.DeploymentDao) private deploymentDao: DeploymentDao,
        @inject(TYPES.DeploymentManager) private deploymentManager: DeploymentManager,
        @inject(TYPES.DeploymentTemplateDao) private deploymentTemplatesDao: DeploymentTemplatesDao
    ) {}

    public async create(deploymentRequest: DeploymentRequest): Promise<string> {
        logger.debug(`DeploymentService.createDeployment: in: deployment: ${JSON.stringify(deploymentRequest)}`);

        ow(deploymentRequest, 'Deployment Information', ow.object.nonEmpty);
        ow(deploymentRequest.deploymentTemplateName, ow.string.nonEmpty);
        ow(deploymentRequest.deviceId, ow.string.nonEmpty);

        // check if device exists in registry before creating a deployment
        if (await this.iotUtil.deviceExistsInRegistry(deploymentRequest.deviceId) !== true) {
            throw new Error('DEVICE_NOT_FOUND');
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
            throw err;
        }

        await this.deploymentDao.save(deployment);

        logger.debug(`DeploymentService.createDeployment out: result: ${JSON.stringify(result)}`);

        return deployment.deploymentId;
    }

    public async deploy(deployment: DeploymentModel): Promise<void> {
        logger.debug(`DeploymentService.deploy: in: deployment: ${JSON.stringify(deployment)}`);

        ow(deployment, 'Deployment Information', ow.object.nonEmpty);

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

        try {
            await this.deploymentManager.deploy(deployment);
        } catch (err) {
            logger.error(`deployment.service deploymentManager.deploy: err: ${err}`);
            deployment.deploymentStatus = DeploymentStatus.FAILED;
        }

        await this.deploymentDao.update(deployment);

        logger.debug(`DeploymentService.deploy exit:`);
    }

    public async get(deploymentId:string, deviceId: string): Promise<DeploymentModel> {
        logger.debug(`DeploymentService getDeploymentByDeviceId: in: deviceId: ${deviceId}`);

        ow(deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deviceId, 'Device Id', ow.string.nonEmpty);

        const deployment = await this.deploymentDao.get(deploymentId, deviceId);

        logger.debug(`deployment.service getDeploymentByDeviceId: exit: deployment: ${JSON.stringify(deployment)}`);
        return deployment;
    }

    public async listDeploymentsByDeviceId(deviceId: string, status?: string): Promise<DeploymentList> {
        logger.debug(`DeploymentService listDeploymentsByDeviceId: in: deviceId: ${deviceId}`);

        ow(deviceId, 'Device Id', ow.string.nonEmpty);

        // check if device exists in registry before creating a deployment
        if (await this.iotUtil.deviceExistsInRegistry(deviceId) !== true) {
            throw new Error('DEVICE_NOT_FOUND');
        }

        let deployments;
        try {
            deployments = await this.deploymentDao.list(deviceId, status);
        } catch (err) {
            logger.error(`deployment.service deploymentDao.list: err: ${err}`);
            throw err;
        }

        if(!deployments) {
            return <DeploymentList> {
                deployments: []
            }
        }

        logger.debug(`deployment.service listDeploymentsByDeviceId: exit: deployment: ${JSON.stringify(deployments)}`);
        return deployments;
    }

    public async delete(deploymentId:string, deviceId: string): Promise<void> {
        logger.debug(`deployment.service delete: in: deploymentId: ${deploymentId}, deviceId: ${deviceId}`);

        ow(deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deviceId, 'Device Id', ow.string.nonEmpty);

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
            throw err;
        }

        await this.deploymentDao.delete(deployment);

        logger.debug(`deployment.service delete out: result: ${JSON.stringify(result)}`);

    }

    public async update(deployment: DeploymentModel): Promise<void> {
        logger.debug(`deployment.service updateByDeviceId: in: deployment: ${JSON.stringify(deployment)}`);

        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deployment.deviceId, 'Device Id', ow.string.nonEmpty);

        const existingDeployment = await this.get(deployment.deploymentId, deployment.deviceId);

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

    public async retry(deployment: DeploymentModel): Promise<void> {
        logger.debug(`deployment.service patch: in: deploymentId: ${JSON.stringify(deployment)}`);

        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentId, 'Deployment Id', ow.string.nonEmpty);
        ow(deployment.deviceId, 'Device Id', ow.string.nonEmpty);
        ow(deployment.deploymentStatus, 'Deployment Status', ow.string.nonEmpty);

        if(deployment.deploymentStatus !== DeploymentStatus.RETRY) {
            throw new Error('UNSUPPORTED_DEPLOYMENT_STATUS')
        }

        const existingDeployment = await this.get(deployment.deploymentId, deployment.deviceId);

        if (!existingDeployment) {
            throw new Error('NOT_FOUND') ;
        }

        Object.assign(existingDeployment, deployment);

        ow(existingDeployment.deploymentTemplateName, 'Deployment Template Name', ow.string.nonEmpty)

        // Get the deployment template for the deployment
        let template:DeploymentTemplateModel;
        try {
            template = await this.deploymentTemplatesDao.get(existingDeployment.deploymentTemplateName);
        } catch (err) {
            throw new Error('DEPLOYMENT_TEMPLATE_NOT_FOUND');
        }

        if(!template) {
            throw new Error('DEPLOYMENT_TEMPLATE_NOT_FOUND');
        }

        existingDeployment.deploymentTemplate = template

        let result;
        try {
            result = await this.deploymentManager.update(existingDeployment);
        } catch (err) {
            logger.error(`deployment.service deploymentManager.update: err: ${err}`);
            throw err;
        }

        await this.deploymentDao.update(existingDeployment);

        logger.debug(`deployment.service patch out: result: ${JSON.stringify(result)}`);
    }

}
