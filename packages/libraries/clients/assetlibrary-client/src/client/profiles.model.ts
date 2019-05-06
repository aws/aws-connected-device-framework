/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Device } from './devices.model';
import { Group } from './groups.model';

export interface DeviceProfile extends Device {
    profileId:string;
}

export interface GroupProfile extends Group {
    profileId:string;
}

export interface ProfileList {
    results: (DeviceProfile|GroupProfile)[];
    pagination?: {
        offset:number;
        count:number;
    };
}
