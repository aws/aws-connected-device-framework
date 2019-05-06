/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger';
import { DeviceProfileModel, GroupProfileModel, ProfileModelList } from './profiles.models';
import { ProfilesService } from './profiles.service';

@injectable()
export class ProfilesServiceLite implements ProfilesService {

    public async get(templateId:string, profileId:string): Promise<DeviceProfileModel|GroupProfileModel> {
        logger.debug(`profiles.full.service get: in: templateId:${templateId}, profileId:${profileId}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async create(model:DeviceProfileModel|GroupProfileModel) : Promise<string> {
        logger.debug(`profiles.full.service create: in: model:${JSON.stringify(model)}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async update(model: DeviceProfileModel | GroupProfileModel) : Promise<string> {
        logger.debug(`profiles.full.service update: in: model: ${JSON.stringify(model)}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async delete(templateId:string, profileId:string) : Promise<void> {
        logger.debug(`profiles.full.service delete: in: templateId:${templateId}, profileId:${profileId}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async list(templateId:string): Promise<ProfileModelList> {
        logger.debug(`profiles.full.service list: in: templateId:${templateId}`);
        throw new Error('NOT_SUPPORTED');
    }
}
