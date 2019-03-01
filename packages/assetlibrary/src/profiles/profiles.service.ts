/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { DeviceProfileModel, GroupProfileModel, ProfileModelList } from './profiles.models';

export interface ProfilesService {

    get(templateId:string, profileId:string): Promise<DeviceProfileModel|GroupProfileModel> ;

    create(model:DeviceProfileModel|GroupProfileModel) : Promise<string> ;

    update(model: DeviceProfileModel | GroupProfileModel) : Promise<string> ;

    delete(templateId:string, profileId:string) : Promise<void> ;

    list(templateId:string): Promise<ProfileModelList> ;
}
