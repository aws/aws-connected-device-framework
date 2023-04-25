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
import { injectable } from 'inversify';
import { PathHelper } from '../utils/path.helper';
import { RequestHeaders } from './common.model';
import { ClientServiceBase } from './common.service';
import {
    BulkDevicesResource,
    BulkDevicesResult,
    Device10Resource,
    Device20Resource,
    DeviceResourceList,
} from './devices.model';

export interface DevicesService {
    /**
     * Associates a device to another device, giving context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param otherDeviceId ID of device to create relationship to.
     *
     * @throws {HttpError}
     */
    attachToDevice(deviceId: string, relationship: string, otherDeviceId: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Associates a device to another device, giving context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param direction Direction (in|out) of the relation,
     * @param otherDeviceId ID of device to create relationship to.
     *
     * @throws {HttpError}
     */
    attachToDeviceWithDirection(
        deviceId: string,
        relationship: string,
        direction: string,
        otherDeviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void>

    /**
     * Associates a device to a group, giving context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param groupPath Path of group.
     *
     * @throws {HttpError}
     */
    attachToGroup(deviceId: string, relationship: string, groupPath: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Associates a device to a group, giving direction and context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param direction Direction (in|out) of the relation.
     * @param groupPath Path of group.
     *
     * @throws {HttpError}
     */
    attachToGroupWithDirection(
        deviceId: string,
        relationship: string,
        direction: string,
        groupPath: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void>

    /**
     * Createa a new component and adds to the device.
     *
     * @param deviceId Id of parent device
     * @param body Device to add as a component
     *
     * @throws {HttpError}
     */
    createComponent(deviceId: string, body: Device10Resource | Device20Resource, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Add a new device to the asset library, adding it to the &#x60;/unprovisioned&#x60; group if no group is specified.
     *
     * @param body Device to add to the asset library
     *
     * @throws {HttpError}
     */
    createDevice(body: Device10Resource | Device20Resource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Adds a batch of devices in bulk to the asset library, adding them to the &#x60;/unprovisioned&#x60; group if no groups are specified.
     *
     * @param body Device to add to the asset library
     *
     * @throws {HttpError}
     */
    bulkCreateDevice(body: BulkDevicesResource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<BulkDevicesResult>;

    /**
     * Updates a batch of devices in bulk to the asset library, adding them to the &#x60;/unprovisioned&#x60; group if no groups are specified.
     *
     * @param body Device to add to the asset library
     *
     * @throws {HttpError}
     */
    bulkUpdateDevice(body: BulkDevicesResource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Deletes a component of a devoce.
     *
     * @param deviceId Id of parent device
     * @param componentId ID of child component
     *
     * @throws {HttpError}
     */
    deleteComponent(deviceId: string, componentId: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Delete device of specified ID
     * Deletes a single device
     * @param deviceId ID of device to return
     *
     * @throws {HttpError}
     */
    deleteDevice(deviceId: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Removes a device from an associated device
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param otherDeviceId ID of device to create relationship to.
     *
     * @throws {HttpError}
     */
    detachFromDevice(deviceId: string, relationship: string, otherDeviceId: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Removes a devices from associated devices
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     *
     * @throws {HttpError}
     */
    detachFromDevices(deviceId: string, relationship: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Removes a device from associated devices
     *
     * @param deviceId Id of device to attach to the group
     *
     * @throws {HttpError}
     */
    detachFromAllDevices(deviceId: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Removes a device from an associated device
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param direction Direction (in|out) of relation.
     * @param otherDeviceId ID of device to create relationship to.
     *
     * @throws {HttpError}
     */
    detachFromDeviceWithDirection(
        deviceId: string,
        relationship: string,
        direction: string,
        otherDeviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void>

    /**
     * Removes a device from an associated group
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param groupPath Path of group.
     *
     * @throws {HttpError}
     */
    detachFromGroup(deviceId: string, relationship: string, groupPath: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Removes a device from all groups, associated via a specific relation
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     *
     * @throws {HttpError}
     */
    detachFromGroups(deviceId: string, relationship: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Removes a device from all its associated groups
     *
     * @param deviceId Id of device to attach to the group
     *
     * @throws {HttpError}
     */
    detachFromAllGroups(deviceId: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Removes a device from an associated group
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param direction Direction (in|out) of relation.
     * @param groupPath Path of group.
     *
     * @throws {HttpError}
     */
    detachFromGroupWithDirection(
        deviceId: string,
        relationship: string,
        direction: string,
        groupPath: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void>

    /**
     * Find device by ID
     * Returns a single device
     * @param deviceId ID of device to return
     * @param expandComponents By default, components of a device are not returned. Passing &#x60;true&#x60; will return and expand a devices components.
     *
     * @throws {HttpError}
     */
    getDeviceByID(deviceId: string, expandComponents?: boolean, attributes?: string[], groups?: string[], additionalHeaders?:RequestHeaders): Promise<Device10Resource | Device20Resource>;

    /**
     * Updates the component of a device.
     *
     * @param deviceId Id of parent device
     * @param componentId ID of child component
     *
     * @throws {HttpError}
     */
    updateComponent(deviceId: string, componentId: string, body: Device10Resource | Device20Resource, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Update an existing device attributes
     *
     * @param deviceId ID of device to return
     * @param body Device object that needs to be updated in device store
     *
     * @throws {HttpError}
     */
    updateDevice(deviceId: string, body: Device10Resource | Device20Resource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<void>;

    /**
     * Find devices by ID
     * Returns mulitple devices
     * @param deviceIds IDs of device to return
     * @param expandComponents By default, components of a device are not returned. Passing &#x60;true&#x60; will return and expand a devices components.
     *
     * @throws {HttpError}
     */
    getDevicesByID(deviceIds: string[], expandComponents?: boolean, attributes?: string[], groups?: string[], additionalHeaders?:RequestHeaders): Promise<DeviceResourceList>;
}

@injectable()
export class DevicesServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected devicesRelativeUrl() : string {
        return '/devices';
    }

    protected deviceRelativeUrl(deviceId: string) : string {
        return PathHelper.encodeUrl('devices', deviceId);
    }

    protected deviceAttachedDevicesRelativeUrl(deviceId: string, relationship: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, relationship, 'devices');
    }

    protected deviceAttachedDeviceRelativeUrl(deviceId: string, relationship: string, otherDeviceId: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, relationship, 'devices', otherDeviceId);
    }

    protected deviceAttachedDirectionalDeviceRelativeUrl(deviceId: string, relationship: string, direction:string, otherDeviceId: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, relationship, direction, 'devices', otherDeviceId);
    }

    protected deviceAttachedGroupsRelativeUrl(deviceId: string, relationship: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, relationship, 'groups');
    }

    protected deviceAttachedGroupRelativeUrl(deviceId: string, relationship: string, groupPath: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, relationship, 'groups', groupPath);
    }

    protected deviceAttachedDirectionalGroupRelativeUrl(deviceId: string, relationship: string, direction:string, groupPath: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, relationship, direction, 'groups', groupPath);
    }

    protected deviceAttachedComponentsRelativeUrl(deviceId: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, 'components');
    }

    protected deviceAttachedComponentRelativeUrl(deviceId: string, componentId: string) : string {
        return PathHelper.encodeUrl('devices', deviceId, 'components', componentId);
    }

    protected bulkDevicesRelativeUrl() : string {
        return '/bulkdevices';
    }

}
