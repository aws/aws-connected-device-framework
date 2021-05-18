/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import ow from 'ow';
import { inject, injectable } from 'inversify';
import config from 'config';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';

import { ActivationItem, ActivationResource } from './activation.model';
import { ActivationDao } from './activation.dao';
import {IotUtil} from '../utils/iot.util';

@injectable()
export class ActivationService {

    private readonly ssm: AWS.SSM;
    private readonly hybridInstancerole: string;

    constructor(
        @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM,
        @inject(TYPES.IotUtil) private iotUtil: IotUtil,
        @inject(TYPES.ActivationDao) private activationDao: ActivationDao
    ) {
        this.ssm = ssmFactory();
        this.hybridInstancerole =  config.get('aws.ssm.managedInstanceRole');
    }

    public async createActivation(activation: ActivationItem): Promise<ActivationItem> {
        logger.debug(`ActivationService: createActivation: request:${JSON.stringify(activation)}`);

        ow(activation.deviceId, ow.string.nonEmpty);

        if (await this.iotUtil.deviceExistsInRegistry(activation.deviceId) !== true) {
            throw new Error('DEVICE_NOT_FOUND');
        }

        // check if the device already has an activation
        // cleanup the activation from ssm, if it has an activation
       await this.deleteActivationByDeviceId(activation.deviceId);

        // SSM Role for hybrid instance
        const hybridInstanceRole = this.hybridInstancerole;

        const activationParams: AWS.SSM.CreateActivationRequest = {
            DefaultInstanceName: `${activation.deviceId}`,
            IamRole: hybridInstanceRole,
        };

        // create an activation
        let result;
        try {
            result = await this.ssm.createActivation(activationParams).promise();
        } catch (err) {
            logger.error(`activation.service ssm.createActivation`, {err});
            throw err;
        }

        const activationModel: ActivationItem = {
            deviceId: activation.deviceId,
            activationId: result.ActivationId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const activationResource: ActivationResource = {
            activationId: result.ActivationId,
            activationCode: result.ActivationCode,
            activationRegion: config.get('aws.region')
        };

        await this.activationDao.save(activationModel);

        logger.debug(`ActivationService: createActivation: out: ${JSON.stringify(result)}`);

        return activationResource;
    }

    public async getActivation(_activationId: string, deviceId: string): Promise<ActivationItem> {
        logger.info(`ActivationService: getActivation: in: deviceId: ${deviceId}`);

        // Get activation by passing a filter for default instance Name (deviceId)

        let activation;
        try {
            activation = await this.activationDao.getByDeviceId(deviceId);
        } catch (err) {
            logger.error(`activation.service activationDao.getByDeviceId`, {err});
            throw err;
        }

        if(!activation) {
            throw new Error('NOT_FOUND');
        }

        logger.debug(`ActivationService: getActivation: out: activation:${JSON.stringify(activation)}`);

        return activation;
    }

    public async deleteActivationByDeviceId(deviceId: string): Promise<void> {
        logger.info(`ActivationService: deleteActivationByDeviceId: in: deviceId: ${deviceId}`);

        let activation:ActivationItem;
        try {
            activation = await this.activationDao.getByDeviceId(deviceId);
        } catch (err) {
            logger.error(`activation.service activationDao.getByDeviceId`, {err});
            throw err;
        }

        if(!activation) {
            return null;
        }

        logger.debug(`ActivationService: deleteActivationByDeviceId: exit`);
        await this.deleteActivation(activation.activationId, activation.deviceId);
    }

    public async deleteActivation(activationId: string, deviceId: string): Promise<void> {
        logger.info(`ActivationService: deleteActivation: in: activationId: ${activationId}`);

        await this.activationDao.delete(activationId, deviceId);

        const params: AWS.SSM.DeleteActivationRequest = {
            ActivationId: activationId
        };

        try {
            await this.ssm.deleteActivation(params).promise();
        } catch (err) {
            logger.error(`activation.service ssm.deleteActivation`, {err});
            throw err;
        }
        logger.debug(`ActivationService: deleteActivation: exit`);

    }

    public async updateActivation(activation: ActivationItem): Promise<void> {
        logger.debug(`ActivationService: updateActivation: request:${JSON.stringify(activation)}`);

        const activationModel: ActivationItem = {
            deviceId: activation.deviceId,
            activationId: activation.activationId,
            createdAt: activation.createdAt,
            updatedAt: new Date()
        };

        await this.activationDao.update(activationModel);

        logger.debug(`ActivationService: updateActivation: exit:`);

    }

}
