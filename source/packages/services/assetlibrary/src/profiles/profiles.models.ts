/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import { DirectionToStringArrayMap } from '../data/model';
import { Node } from '../data/node';
import {
    Device10Resource,
    Device20Resource,
    DeviceBaseResource,
    DeviceItem,
} from '../devices/devices.models';
import {
    Group10Resource,
    Group20Resource,
    GroupBaseResource,
    GroupItem,
} from '../groups/groups.models';

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
    public constructor(init?: Partial<DeviceProfileItem>) {
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
    public constructor(init?: Partial<GroupProfileItem>) {
        super(init);
    }
    profileId: string;
}

export class ProfileNode extends Node {
    templateId?: string;
    groups?: DirectionToStringArrayMap;
}

export class ProfileResourceList {
    results: (DeviceProfileResource | GroupProfileResource)[] = [];
    pagination?: {
        offset: number;
        count: number;
    };
}
export class ProfileItemList {
    results: (DeviceProfileItem | GroupProfileItem)[] = [];
    pagination?: {
        offset: number;
        count: number;
    };
}
