/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import config from 'config';
import { DeviceProfile, GroupProfile, ProfileList } from './profiles.model';

@injectable()
export class ProfilesService  {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    public constructor() {
        this.baseUrl = config.get('assetLibrary.baseUrl') as string;
    }

    private async createProfile(category:string, body:DeviceProfile|GroupProfile): Promise<void> {
        ow(body, ow.object.nonEmpty);
        ow(body.templateId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(body.templateId);
        await request.post(url)
            .send(body)
            .set(this.headers);
    }

    public async createDeviceProfile(body:DeviceProfile): Promise<void> {
        await this.createProfile('device', body);
    }

    public async createGroupProfile(body:GroupProfile): Promise<void> {
        await this.createProfile('group', body);
    }

    private async getProfile(category:string, templateId:string, profileId:string): Promise<DeviceProfile|GroupProfile> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(templateId, profileId);
        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async getDeviceProfile(templateId:string, profileId:string): Promise<DeviceProfile> {
        return await this.getProfile('device', templateId, profileId);
    }

    public async getGroupProfile(templateId:string, profileId:string): Promise<GroupProfile> {
        return await this.getProfile('group', templateId, profileId);
    }

    private async updateProfile(category:string, templateId:string, profileId:string, body: DeviceProfile|GroupProfile): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(templateId, profileId);

        const res = await request.patch(url)
            .send(body)
            .set(this.headers);

        return res.body;
    }

    public async updateDeviceProfile(templateId:string, profileId:string, body: DeviceProfile): Promise<void> {
        await this.updateProfile('device', templateId, profileId, body);
    }

    public async updateGroupProfile(templateId:string, profileId:string, body: GroupProfile): Promise<void> {
        await this.updateProfile('group', templateId, profileId, body);
    }

    private async deleteProfile(category:string, templateId:string, profileId:string): Promise<void> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(templateId, profileId);
        const res = await request.delete(url)
            .set(this.headers);

        return res.body;
    }

    public async deleteDeviceProfile(templateId:string, profileId:string): Promise<void> {
        return await this.deleteProfile('device', templateId, profileId);
    }

    public async deleteGroupProfile(templateId:string, profileId:string): Promise<void> {
        return await this.deleteProfile('group', templateId, profileId);
    }

    private async listProfiles(category:string, templateId:string): Promise<ProfileList> {
        ow(category, ow.string.nonEmpty);
        ow(templateId, ow.string.nonEmpty);

        const url = this.baseUrl + '/profiles/' + category + PathHelper.encodeUrl(templateId);
        const res = await request.get(url)
            .set(this.headers);

        return res.body;
    }

    public async listDeviceProfiles(templateId:string): Promise<ProfileList> {
        return await this.listProfiles('device', templateId);
    }

    public async listGroupProfiles(templateId:string): Promise<ProfileList> {
        return await this.listProfiles('group', templateId);
    }
}
