/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestParam, requestBody, httpPost, httpGet, httpPatch, httpDelete } from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';
import { TypeCategory } from '../types/constants';
import { DeviceProfileModel, GroupProfileModel, ProfileModelList } from './profiles.models';
import { ProfilesService } from './profiles.service';

@controller('/profiles/:category/:templateId')
export class ProfilesController implements interfaces.Controller {

    constructor( @inject(TYPES.ProfilesService) private profilesService: ProfilesService) {}

    @httpPost('')
    public async createProfile(@requestParam('category') category:TypeCategory, @requestParam('templateId') templateId:string,
         @requestBody() profile:DeviceProfileModel|GroupProfileModel, @response() res: Response) {
        logger.info(`profiles.controller  createProfile: in: category:${category}, template:${templateId}, profile:${JSON.stringify(profile)}`);

        profile.templateId = templateId;
        profile.category = category;
        try {
            await this.profilesService.create(profile);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('/:profileId')
    public async getProfile(@requestParam('category') category:TypeCategory, @requestParam('templateId') templateId:string,
        @requestParam('profileId') profileId:string, @response() res: Response): Promise<DeviceProfileModel|GroupProfileModel> {

        logger.info(`profiles.controller getProfile: in: category:${category}, template:${templateId}, profileId:${profileId}`);

        let model:DeviceProfileModel|GroupProfileModel;
        try {
            model = await this.profilesService.get(templateId, profileId);
            if (model===undefined) {
                res.status(404).end();
            }
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`profiles.controller  exit: ${JSON.stringify(model)}`);
        return model;
    }

    @httpPatch('/:profileId')
    public async updateProfile(@requestParam('category') category:TypeCategory, @requestParam('templateId') templateId:string,
        @requestParam('profileId') profileId:string, @requestBody() profile: DeviceProfileModel|GroupProfileModel,
        @response() res: Response) {

        logger.info(`profiles.controller updateProfile: in: category:${category}, template:${templateId}, profileId:${profileId}`);
        try {
            profile.profileId = profileId;
            profile.category = category;
            profile.templateId = templateId;
            const r = await this.profilesService.update(profile);

            if (r===undefined) {
                res.status(404).end();
            } else {
                res.status(204).end();
            }
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:profileId')
    public async deleteProfile(@requestParam('category') category:TypeCategory, @requestParam('templateId') templateId:string,
    @requestParam('profileId') profileId:string, @response() res: Response) {

        logger.info(`profiles.controller deleteProfile: in: category:${category}, template:${templateId}, profileId:${profileId}`);
        try {
            await this.profilesService.delete(templateId, profileId);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('')
    public async listProfiles(@requestParam('category') category:TypeCategory, @requestParam('templateId') templateId:string,
        @response() res: Response): Promise<ProfileModelList> {

        logger.info(`profiles.controller listProfiles: in: category:${category}, template:${templateId}`);

        let model: ProfileModelList;

        try {
            model = await this.profilesService.list(templateId);

            if (model===undefined) {
                res.status(404).end();
            }

        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`profiles.controller listProfiles:  exit: ${JSON.stringify(model)}`);
        return model;
    }
}
