/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

/* tslint:disable:no-unused-variable member-ordering */

import { injectable } from 'inversify';
import ow from 'ow';
import { PathHelper } from '../utils/path.helper';
import * as request from 'superagent';
import { GroupProfileResource, DeviceProfileResource, ProfileResourceList } from './profiles.model';
import { ClientService, ClientOptions } from './common.service';

@injectable()
export class ProfilesService extends ClientService {

    public constructor(options?:ClientOptions) {
        super(options);
    }


    private async createProfile(category:string, body:DeviceProfileResource|GroupProfileResource): Promise<void> {
        ow(body, ow.object.nonEmpty);
        ow(body.templateId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(body.templateId);
        await request.post(url)
            .send(body)
            .set(super.getHeaders());
    }

    public async createDeviceProfile(body:DeviceProfileResource): Promise<void> {
        await this.createProfile('device', body);
    }

    public async createGroupProfile(body:GroupProfileResource): Promise<void> {
        await this.createProfile('group', body);
    }

    private async getProfile(category:string, templateId:string, profileId:string): Promise<DeviceProfileResource|GroupProfileResource> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(templateId, profileId);
        const res = await request.get(url)
            .set(super.getHeaders());

        return res.body;
    }

    public async getDeviceProfile(templateId:string, profileId:string): Promise<DeviceProfileResource> {
        return await this.getProfile('device', templateId, profileId);
    }

    public async getGroupProfile(templateId:string, profileId:string): Promise<GroupProfileResource> {
        return await this.getProfile('group', templateId, profileId);
    }

    private async updateProfile(category:string, templateId:string, profileId:string, body: DeviceProfileResource|GroupProfileResource): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(templateId, profileId);

        const res = await request.patch(url)
            .send(body)
            .set(super.getHeaders());

        return res.body;
    }

    public async updateDeviceProfile(templateId:string, profileId:string, body: DeviceProfileResource): Promise<void> {
        await this.updateProfile('device', templateId, profileId, body);
    }

    public async updateGroupProfile(templateId:string, profileId:string, body: GroupProfileResource): Promise<void> {
        await this.updateProfile('group', templateId, profileId, body);
    }

    private async deleteProfile(category:string, templateId:string, profileId:string): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(templateId, profileId);
        const res = await request.delete(url)
            .set(super.getHeaders());

        return res.body;
    }

    public async deleteDeviceProfile(templateId:string, profileId:string): Promise<void> {
        return await this.deleteProfile('device', templateId, profileId);
    }

    public async deleteGroupProfile(templateId:string, profileId:string): Promise<void> {
        return await this.deleteProfile('group', templateId, profileId);
    }

    private async listProfiles(category:string, templateId:string): Promise<ProfileResourceList> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(templateId);
        const res = await request.get(url)
            .set(super.getHeaders());

        return res.body;
    }

    public async listDeviceProfiles(templateId:string): Promise<ProfileResourceList> {
        return await this.listProfiles('device', templateId);
    }

    public async listGroupProfiles(templateId:string): Promise<ProfileResourceList> {
        return await this.listProfiles('group', templateId);
    }
}
