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
import { DeviceItem, BulkDevicesResult, DeviceItemList } from './devices.models';
import { GroupItemList } from '../groups/groups.models';
import { SortKeys } from '../data/model';

export interface DevicesService {
    get(
        deviceId: string,
        expandComponents?: boolean,
        attributes?: string[],
        includeGroups?: boolean,
    ): Promise<DeviceItem>;

    getBulk(
        deviceIds: string[],
        expandComponents: boolean,
        attributes: string[],
        includeGroups: boolean,
    ): Promise<DeviceItemList>;

    createBulk(devices: DeviceItem[], applyProfile?: string): Promise<BulkDevicesResult>;

    create(model: DeviceItem, applyProfile?: string): Promise<string>;

    updateBulk(devices: DeviceItem[], applyProfile?: string): Promise<BulkDevicesResult>;

    update(model: DeviceItem, applyProfile?: string): Promise<void>;

    delete(deviceId: string): Promise<void>;

    attachToGroup(
        deviceId: string,
        relationship: string,
        direction: string,
        groupPath: string,
    ): Promise<void>;

    detachFromGroup(
        deviceId: string,
        relationship: string,
        direction: string,
        groupPath: string,
    ): Promise<void>;

    detachFromGroups(
        deviceId: string,
        template?: string,
        relationship?: string,
        direction?: string,
    ): Promise<void>;

    attachToDevice(
        deviceId: string,
        relationship: string,
        direction: string,
        otherDeviceId: string,
    ): Promise<void>;

    detachFromDevice(
        deviceId: string,
        relationship: string,
        direction: string,
        otherDeviceId: string,
    ): Promise<void>;

    detachFromDevices(
        deviceId: string,
        template?: string,
        relationship?: string,
        direction?: string,
    ): Promise<void>;

    updateComponent(deviceId: string, componentId: string, model: DeviceItem): Promise<void>;

    deleteComponent(deviceId: string, componentId: string): Promise<void>;

    createComponent(parentDeviceId: string, model: DeviceItem): Promise<string>;

    listRelatedDevices(
        deviceId: string,
        relationship: string,
        direction: string,
        template: string,
        state: string,
        offset: number,
        count: number,
        sort: SortKeys,
    ): Promise<DeviceItemList>;

    listRelatedGroups(
        deviceId: string,
        relationship: string,
        direction: string,
        template: string,
        offset: number,
        count: number,
        sort: SortKeys,
    ): Promise<GroupItemList>;
}
