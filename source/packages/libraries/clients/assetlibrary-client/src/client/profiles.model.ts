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
