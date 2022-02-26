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
import {
    BulkDevicesResource,
    BulkDevicesResult,
    Device10Resource,
    Device20Resource,
    DeviceResourceList,
} from './devices.model';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { DevicesService, DevicesServiceBase } from './devices.service';
import { RequestHeaders } from './common.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';

@injectable()
export class DevicesLambdaService extends DevicesServiceBase implements DevicesService {

    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.ASSETLIBRARY_API_FUNCTION_NAME
    }

    /**
     * Associates a device to another device, giving context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param otherDeviceId ID of device to create relationship to.
     */
    async attachToDevice(deviceId: string, relationship: string, otherDeviceId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedDeviceRelativeUrl(deviceId, relationship, otherDeviceId))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Associates a device to another device, giving direction and context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param direction Direction (in|out) of the relation,
     * @param otherDeviceId ID of device to create relationship to.
     */
    async attachToDeviceWithDirection(deviceId: string, relationship: string, direction: string, otherDeviceId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.nonEmpty);
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedDirectionalDeviceRelativeUrl(deviceId, relationship, direction, otherDeviceId))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Associates a device to a group, giving context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param groupPath Path of group.
     */
    async attachToGroup(deviceId: string, relationship: string, groupPath: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedGroupRelativeUrl(deviceId, relationship, groupPath))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Associates a device to a group, giving direction and context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param direction Direction (in|out) of the relation.
     * @param groupPath Path of group.
     */
    async attachToGroupWithDirection(deviceId: string, relationship: string, direction: string, groupPath: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.nonEmpty);
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedDirectionalGroupRelativeUrl(deviceId, relationship, direction, groupPath))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Createa a new component and adds to the device.
     *
     * @param deviceId Id of parent device
     * @param body Device to add as a component
     */
    async createComponent(deviceId: string, body: Device10Resource | Device20Resource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedComponentsRelativeUrl(deviceId))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(body);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Add a new device to the asset library, adding it to the &#x60;/unprovisioned&#x60; group if no group is specified.
     *
     * @param body Device to add to the asset library
     */
    async createDevice(body: Device10Resource | Device20Resource, applyProfileId?: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.devicesRelativeUrl())
            .setQueryStringParameters({ applyProfile: applyProfileId })
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(body);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Adds a batch of devices in bulk to the asset library, adding them to the &#x60;/unprovisioned&#x60; group if no groups are specified.
     *
     * @param body Device to add to the asset library
     */
    async bulkCreateDevice(body: BulkDevicesResource, applyProfileId?: string, additionalHeaders?: RequestHeaders): Promise<BulkDevicesResult> {

        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.bulkDevicesRelativeUrl())
            .setQueryStringParameters({ applyProfile: applyProfileId })
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(body);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async bulkUpdateDevice(body: BulkDevicesResource, applyProfileId?: string, additionalHeaders?: RequestHeaders): Promise<void> {

        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.bulkDevicesRelativeUrl())
            .setQueryStringParameters({ applyProfile: applyProfileId })
            .setMethod('PATCH')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(body);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    /**
     * Deletes a component of a devoce.
     *
     * @param deviceId Id of parent device
     * @param componentId ID of child component
     */
    async deleteComponent(deviceId: string, componentId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(componentId, 'componentId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedComponentRelativeUrl(deviceId, componentId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Delete device of specified ID
     * Deletes a single device
     * @param deviceId ID of device to return
     */
    async deleteDevice(deviceId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceRelativeUrl(deviceId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Removes a device from an associated device
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param otherDeviceId ID of device to create relationship to.
     */
    async detachFromDevice(deviceId: string, relationship: string, otherDeviceId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedDeviceRelativeUrl(deviceId, relationship, otherDeviceId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Removes a device from an associated device
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param direction Direction (in|out) of relation.
     * @param otherDeviceId ID of device to create relationship to.
     */
    async detachFromDeviceWithDirection(deviceId: string, relationship: string, direction: string, otherDeviceId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.nonEmpty);
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedDirectionalDeviceRelativeUrl(deviceId, relationship, direction, otherDeviceId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Removes a device from an associated group
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param groupPath Path of group.
     */
    async detachFromGroup(deviceId: string, relationship: string, groupPath: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedGroupRelativeUrl(deviceId, relationship, groupPath))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Removes a device from an associated group
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param direction Direction (in|out) of relation.
     * @param groupPath Path of group.
     */
    async detachFromGroupWithDirection(deviceId: string, relationship: string, direction: string, groupPath: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.nonEmpty);
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedDirectionalGroupRelativeUrl(deviceId, relationship, direction, groupPath))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Find device by ID
     * Returns a single device
     * @param deviceId ID of device to return
     * @param expandComponents By default, components of a device are not returned. Passing &#x60;true&#x60; will return and expand a devices components.
     */
    async getDeviceByID(deviceId: string, expandComponents?: boolean, attributes?: string[], groups?: string[], additionalHeaders?: RequestHeaders): Promise<Device10Resource | Device20Resource> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        const attributes_qs = (attributes) ? attributes.join() : undefined;
        const groups_qs = (groups) ? groups.join() : undefined;

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceRelativeUrl(deviceId))
            .setMethod('GET')
            .setQueryStringParameters({
                expandComponents: `${expandComponents}`,
                attributes: attributes_qs,
                includeGroups: groups_qs,
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    /**
     * Updates the component of a device.
     *
     * @param deviceId Id of parent device
     * @param componentId ID of child component
     */
    async updateComponent(deviceId: string, componentId: string, body: Device10Resource | Device20Resource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(componentId, 'componentId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedComponentRelativeUrl(deviceId, componentId))
            .setMethod('PATCH')
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Update an existing device attributes
     *
     * @param deviceId ID of device to return
     * @param body Device object that needs to be updated in device store
     */
    async updateDevice(deviceId: string, body: Device10Resource | Device20Resource, applyProfileId?: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceRelativeUrl(deviceId))
            .setMethod('PATCH')
            .setQueryStringParameters({
                applyProfile: applyProfileId
            })
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Find devices by ID
     * Returns mulitple devices
     * @param deviceIds IDs of device to return
     * @param expandComponents By default, components of a device are not returned. Passing &#x60;true&#x60; will return and expand a devices components.
     */
    async getDevicesByID(deviceIds: string[], expandComponents?: boolean, attributes?: string[], groups?: string[], additionalHeaders?: RequestHeaders): Promise<DeviceResourceList> {
        ow(deviceIds, 'deviceIds', ow.array.nonEmpty.minLength(1));

        const attributes_qs = (attributes) ? attributes.join() : undefined;
        const groups_qs = (groups) ? groups.join() : undefined;

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.bulkDevicesRelativeUrl())
            .setMethod('GET')
            .setQueryStringParameters({
                deviceIds: deviceIds.join(','),
                expandComponents: `${expandComponents}`,
                attributes: attributes_qs,
                includeGroups: groups_qs,
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);

        return res.body;
    }

}
