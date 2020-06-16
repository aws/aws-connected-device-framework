/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {DeviceProfileResource, GroupProfileResource, ProfileResourceList} from './profiles.model';
import {ProfilesService, ProfilesServiceBase} from './profiles.service';
import {RequestHeaders} from './common.model';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';

@injectable()
export class ProfilesLambdaService extends ProfilesServiceBase implements ProfilesService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('assetLibrary.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createProfile(category: string, body: DeviceProfileResource | GroupProfileResource, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(body, ow.object.nonEmpty);
        ow(body.templateId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.profilesOfTemplateRelativeUrl(category, body.templateId))
            .setMethod('POST')
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
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

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.profileRelativeUrl(category, templateId, profileId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
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

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.profileRelativeUrl(category, templateId, profileId))
            .setMethod('PATCH')
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
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

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.profileRelativeUrl(category, templateId, profileId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
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

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.profilesOfTemplateRelativeUrl(category, templateId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listDeviceProfiles(templateId: string, additionalHeaders?:RequestHeaders): Promise<ProfileResourceList> {
        return await this.listProfiles('device', templateId, additionalHeaders);
    }

    async listGroupProfiles(templateId: string, additionalHeaders?:RequestHeaders): Promise<ProfileResourceList> {
        return await this.listProfiles('group', templateId, additionalHeaders);
    }
}
