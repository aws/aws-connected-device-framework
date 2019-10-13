/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Node } from '../data/node';
import { DirectionStringToArrayMap } from '../data/model';
import { Device10Resource, Device20Resource, DeviceBaseResource, DeviceItem } from '../devices/devices.models';
import { Group10Resource, Group20Resource, GroupBaseResource, GroupItem } from '../groups/groups.models';

export class ProfileMixin {
	profileId: string;
}

export interface DeviceProfileResource extends DeviceBaseResource, ProfileMixin {}
export interface DeviceProfile10Resource extends Device10Resource, ProfileMixin {}
export interface DeviceProfile20Resource extends Device20Resource, ProfileMixin {}

export interface DeviceProfileItem extends DeviceItem, ProfileMixin {}

export interface GroupProfileResource extends GroupBaseResource, ProfileMixin {}
export interface GroupProfile10Resource extends Group10Resource, ProfileMixin {}
export interface GroupProfile20Resource extends Group20Resource, ProfileMixin {}

export interface GroupProfileItem extends GroupItem, ProfileMixin {}

export class ProfileNode extends Node {
	templateId?: string;
	groups?: DirectionStringToArrayMap;
}

export class ProfileResourceList {
    results: (DeviceProfileResource|GroupProfileResource)[]=[];
    pagination?: {
        offset:number;
        count:number;
    };
}
export class ProfileItemList {
    results: (DeviceProfileItem|GroupProfileItem)[]=[];
    pagination?: {
        offset:number;
        count:number;
    };
}
