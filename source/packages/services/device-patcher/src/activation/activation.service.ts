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
import {inject, injectable} from 'inversify';

import {TYPES} from '../di/types';
import {logger} from '../utils/logger.util';

import {ActivationItem} from './activation.model';
import {ActivationDao} from './activation.dao';

@injectable()
export class ActivationService {

    private readonly ssm: AWS.SSM;
    private readonly hybridInstancerole: string = process.env.AWS_SSM_MANAGED_INSTANCE_ROLE;

    constructor(
        @inject(TYPES.SSMFactory) ssmFactory: () => AWS.SSM,
        @inject(TYPES.ActivationDao) private activationDao: ActivationDao
    ) {
        this.ssm = ssmFactory();
    }

    public async createActivation(activation: ActivationItem): Promise<ActivationItem> {
        logger.debug(`ActivationService: createActivation: request:${JSON.stringify(activation)}`);

        ow(activation, ow.object.nonEmpty);
        ow(activation.deviceId, ow.string.nonEmpty);

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
            activation.activationId = result.ActivationId
            activation.activationCode = result.ActivationCode
            activation.createdAt = new Date()
            activation.updatedAt = activation.createdAt

        } catch (err) {
            logger.error(`activation.service ssm.createActivation`, {err});
            throw err;
        }

        await this.activationDao.save(activation);

        logger.debug(`ActivationService: createActivation: out: ${JSON.stringify(result)}`);

        return {
            activationId: activation.activationId,
            activationCode: activation.activationCode,
            activationRegion: process.env.AWS_REGION
        };
    }

    public async getActivation(activationId:string): Promise<ActivationItem> {
        logger.info(`ActivationService: getActivation: in: activationId: ${activationId}`);

        ow(activationId, ow.string.nonEmpty);

        let activation;
        try {
            activation = await this.activationDao.get(activationId);
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

    public async getActivationByDeviceId(deviceId: string): Promise<ActivationItem> {
        logger.info(`ActivationService: getActivation: in: deviceId: ${deviceId}`);

        ow(deviceId, ow.string.nonEmpty);

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

        ow(deviceId, ow.string.nonEmpty);

        let activation:ActivationItem;
        try {
            activation = await this.activationDao.getByDeviceId(deviceId);
        } catch (err) {
            logger.error(`activation.service activationDao.getByDeviceId`, {err});
            throw err;
        }

        if(!activation) {
            return;
        }

        logger.debug(`ActivationService: deleteActivationByDeviceId: exit`);
        await this.deleteActivation(activation.activationId);
    }

    public async deleteActivation(activationId: string): Promise<void> {
        logger.info(`ActivationService: deleteActivation: in: activationId: ${activationId}`);

        ow(activationId, ow.string.nonEmpty);

        await this.activationDao.delete(activationId);

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

        ow(activation, ow.object.nonEmpty);
        ow(activation.activationId, ow.string.nonEmpty);

        activation.updatedAt = new Date()

        await this.activationDao.update(activation);

        logger.debug(`ActivationService: updateActivation: exit:`);

    }

}
