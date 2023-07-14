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
import { logger } from '@awssolutions/simple-cdf-logger';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    httpPatch,
    httpPost,
    interfaces,
    request,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';
import { TYPES } from '../di/types';
import { TypeCategory } from '../types/constants';
import { handleError } from '../utils/errors';
import { ProfilesAssembler } from './profiles.assembler';
import {
    DeviceProfileItem,
    DeviceProfileResource,
    GroupProfileItem,
    GroupProfileResource,
    ProfileResourceList,
} from './profiles.models';
import { ProfilesService } from './profiles.service';

@controller('/profiles/:category/:templateId')
export class ProfilesController implements interfaces.Controller {
    constructor(
        @inject(TYPES.ProfilesService) private profilesService: ProfilesService,
        @inject(TYPES.ProfilesAssembler) private assembler: ProfilesAssembler,
    ) {}

    @httpPost('')
    public async createProfile(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @requestBody() profile: DeviceProfileResource | GroupProfileResource,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `profiles.controller  createProfile: in: category:${category}, template:${templateId}, profile:${JSON.stringify(
                profile,
            )}`,
        );

        profile.templateId = templateId;
        profile.category = category;
        try {
            let item: DeviceProfileItem | GroupProfileItem;
            if (category === 'device') {
                item = this.assembler.fromDeviceProfileResource(profile as DeviceProfileResource);
            } else {
                item = this.assembler.fromGroupProfileResource(profile as GroupProfileResource);
            }
            await this.profilesService.create(item);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:profileId')
    public async getProfile(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @requestParam('profileId') profileId: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<DeviceProfileResource | GroupProfileResource> {
        logger.info(
            `profiles.controller getProfile: in: category:${category}, template:${templateId}, profileId:${profileId}`,
        );

        let resource: DeviceProfileResource | GroupProfileResource;
        try {
            const item = await this.profilesService.get(templateId, profileId);
            if (item === undefined) {
                res.status(404).end();
            }
            if (category === 'device') {
                resource = this.assembler.toDeviceProfileResource(
                    item as DeviceProfileItem,
                    req['version'],
                );
            } else {
                resource = this.assembler.toGroupProfileResource(
                    item as GroupProfileItem,
                    req['version'],
                );
            }
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`profiles.controller  exit: ${JSON.stringify(resource)}`);
        return resource;
    }

    @httpPatch('/:profileId')
    public async updateProfile(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @requestParam('profileId') profileId: string,
        @requestBody() profile: DeviceProfileResource | GroupProfileResource,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `profiles.controller updateProfile: in: category:${category}, template:${templateId}, profileId:${profileId}`,
        );
        try {
            profile.profileId = profileId;
            profile.category = category;
            profile.templateId = templateId;

            let item: DeviceProfileItem | GroupProfileItem;
            if (category === 'device') {
                item = this.assembler.fromDeviceProfileResource(profile as DeviceProfileResource);
            } else {
                item = this.assembler.fromGroupProfileResource(profile as GroupProfileResource);
            }

            const r = await this.profilesService.update(item);

            if (r === undefined) {
                res.status(404).end();
            } else {
                res.status(204).end();
            }
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/:profileId')
    public async deleteProfile(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @requestParam('profileId') profileId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `profiles.controller deleteProfile: in: category:${category}, template:${templateId}, profileId:${profileId}`,
        );
        try {
            await this.profilesService.delete(templateId, profileId);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('')
    public async listProfiles(
        @requestParam('category') category: TypeCategory,
        @requestParam('templateId') templateId: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<ProfileResourceList> {
        logger.info(
            `profiles.controller listProfiles: in: category:${category}, template:${templateId}`,
        );

        let resources: ProfileResourceList;

        try {
            const items = await this.profilesService.list(templateId);

            if (items === undefined) {
                res.status(404).end();
            }

            resources = this.assembler.toResourceList(items, req['version']);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`profiles.controller listProfiles:  exit: ${JSON.stringify(resources)}`);
        return resources;
    }
}
