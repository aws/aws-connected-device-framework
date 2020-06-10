/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {DeviceProfileResource, GroupProfileResource, ProfileResourceList} from './profiles.model';
import {ProfilesService, ProfilesServiceBase} from './profiles.service';
import {RequestHeaders} from './common.model';

@injectable()
export class ProfilesApigwService extends ProfilesServiceBase implements ProfilesService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('assetLibrary.baseUrl') as string;
    }

    async createProfile(category: string, body: DeviceProfileResource | GroupProfileResource, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(body, ow.object.nonEmpty);
        ow(body.templateId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.profilesOfTemplateRelativeUrl(category, body.templateId)}`;
        await request.post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));
    }

    async createDeviceProfile(body: DeviceProfileResource, additionalHeaders?:RequestHeaders): Promise<void> {
        await this.createProfile('device', body, additionalHeaders);
    }

    async createGroupProfile(body: GroupProfileResource, additionalHeaders?:RequestHeaders): Promise<void> {
        await this.createProfile('group', body, additionalHeaders);
    }

    async getProfile(category: string, templateId: string, profileId: string, additionalHeaders?:RequestHeaders): Promise<DeviceProfileResource | GroupProfileResource> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.profileRelativeUrl(category, templateId, profileId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getDeviceProfile(templateId: string, profileId: string, additionalHeaders?:RequestHeaders): Promise<DeviceProfileResource> {
        return await this.getProfile('device', templateId, profileId, additionalHeaders);
    }

    async getGroupProfile(templateId: string, profileId: string, additionalHeaders?:RequestHeaders): Promise<GroupProfileResource> {
        return await this.getProfile('group', templateId, profileId, additionalHeaders);
    }

    async updateProfile(category: string, templateId: string, profileId: string, body: DeviceProfileResource | GroupProfileResource, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.profileRelativeUrl(category, templateId, profileId)}`;

        const res = await request.patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async updateDeviceProfile(templateId: string, profileId: string, body: DeviceProfileResource, additionalHeaders?:RequestHeaders): Promise<void> {
        await this.updateProfile('device', templateId, profileId, body, additionalHeaders);
    }

    async updateGroupProfile(templateId: string, profileId: string, body: GroupProfileResource, additionalHeaders?:RequestHeaders): Promise<void> {
        await this.updateProfile('group', templateId, profileId, body, additionalHeaders);
    }

    async deleteProfile(category: string, templateId: string, profileId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.profileRelativeUrl(category, templateId, profileId)}`;
        const res = await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async deleteDeviceProfile(templateId: string, profileId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        return await this.deleteProfile('device', templateId, profileId, additionalHeaders);
    }

    async deleteGroupProfile(templateId: string, profileId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        return await this.deleteProfile('group', templateId, profileId, additionalHeaders);
    }

    async listProfiles(category: string, templateId: string, additionalHeaders?:RequestHeaders): Promise<ProfileResourceList> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.profilesOfTemplateRelativeUrl(category, templateId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async listDeviceProfiles(templateId: string, additionalHeaders?:RequestHeaders): Promise<ProfileResourceList> {
        return await this.listProfiles('device', templateId, additionalHeaders);
    }

    async listGroupProfiles(templateId: string, additionalHeaders?:RequestHeaders): Promise<ProfileResourceList> {
        return await this.listProfiles('group', templateId, additionalHeaders);
    }
}
