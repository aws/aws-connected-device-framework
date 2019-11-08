
/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { DeviceBaseResource, Device10Resource, Device20Resource } from './devices.model';
import { GroupBaseResource, Group10Resource, Group20Resource } from './groups.model';

export interface DeviceProfileResource extends DeviceBaseResource {
    profileId: string;
}
export interface DeviceProfile10Resource extends Device10Resource {
    profileId: string;
}
export interface DeviceProfile20Resource extends Device20Resource {
    profileId: string;
}
export interface GroupProfileResource extends GroupBaseResource {
    profileId: string;
}
export interface GroupProfile10Resource extends Group10Resource {
    profileId: string;
}
export interface GroupProfile20Resource extends Group20Resource {
    profileId: string;
}

export interface ProfileResourceList {
    results: (DeviceProfileResource|GroupProfileResource)[];
    pagination?: {
        offset:number;
        count:number;
    };
}
