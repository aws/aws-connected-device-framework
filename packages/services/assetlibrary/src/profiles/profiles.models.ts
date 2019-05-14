/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { DeviceModel } from '../devices/devices.models';
import { GroupModel } from '../groups/groups.models';
import { Node } from '../data/node';

export class DeviceProfileModel extends DeviceModel {
	profileId: string;
}

export class GroupProfileModel extends GroupModel {
	profileId: string;
}

export class ProfileNode extends Node {
	templateId?: string;
	groups?: { [key: string] : string[]};
}

export class ProfileModelList {
    results: (DeviceProfileModel|GroupProfileModel)[]=[];
    pagination?: {
        offset:number;
        count:number;
    };
}
