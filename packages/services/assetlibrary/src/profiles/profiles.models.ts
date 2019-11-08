/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Node } from '../data/node';
import { DirectionStringToArrayMap } from '../data/model';
import { Device10Resource, Device20Resource, DeviceBaseResource, DeviceItem } from '../devices/devices.models';
import { Group10Resource, Group20Resource, GroupBaseResource, GroupItem } from '../groups/groups.models';

export class DeviceProfileResource extends DeviceBaseResource {
    profileId: string;
}
export class DeviceProfile10Resource extends Device10Resource {
    profileId: string;
}
export class DeviceProfile20Resource extends Device20Resource {
    profileId: string;
}

export class DeviceProfileItem extends DeviceItem {
    public constructor(init?:Partial<DeviceProfileItem>) {
        super(init);
    }
    profileId: string;
}

export class GroupProfileResource extends GroupBaseResource {
    profileId: string;
}
export class GroupProfile10Resource extends Group10Resource {
    profileId: string;
}
export class GroupProfile20Resource extends Group20Resource {
    profileId: string;
}

export class GroupProfileItem extends GroupItem {
    public constructor(init?:Partial<GroupProfileItem>) {
        super(init);
    }
    profileId: string;
}

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
