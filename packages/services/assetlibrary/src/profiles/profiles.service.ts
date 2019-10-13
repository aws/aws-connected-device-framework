/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { DeviceProfileItem, GroupProfileItem, ProfileItemList } from './profiles.models';

export interface ProfilesService {

    get(templateId:string, profileId:string): Promise<DeviceProfileItem|GroupProfileItem> ;

    create(model:DeviceProfileItem|GroupProfileItem) : Promise<string> ;

    update(model: DeviceProfileItem | GroupProfileItem) : Promise<string> ;

    delete(templateId:string, profileId:string) : Promise<void> ;

    list(templateId:string): Promise<ProfileItemList> ;
}
