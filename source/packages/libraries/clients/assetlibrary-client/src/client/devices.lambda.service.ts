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
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@aws-solutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { RequestHeaders } from './common.model';
import {
    BulkDevicesResource,
    BulkDevicesResult,
    Device10Resource,
    Device20Resource,
    DeviceResourceList,
} from './devices.model';
import { DevicesService, DevicesServiceBase } from './devices.service';

@injectable()
export class DevicesLambdaService extends DevicesServiceBase implements DevicesService {
    private functionName: string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.ASSETLIBRARY_API_FUNCTION_NAME;
    }

    async attachToDevice(
        deviceId: string,
        relationship: string,
        otherDeviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedDeviceRelativeUrl(deviceId, relationship, otherDeviceId))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async attachToDeviceWithDirection(
        deviceId: string,
        relationship: string,
        direction: string,
        otherDeviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.nonEmpty);
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(
                super.deviceAttachedDirectionalDeviceRelativeUrl(
                    deviceId,
                    relationship,
                    direction,
                    otherDeviceId
                )
            )
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async attachToGroup(
        deviceId: string,
        relationship: string,
        groupPath: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedGroupRelativeUrl(deviceId, relationship, groupPath))
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async attachToGroupWithDirection(
        deviceId: string,
        relationship: string,
        direction: string,
        groupPath: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.nonEmpty);
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(
                super.deviceAttachedDirectionalGroupRelativeUrl(
                    deviceId,
                    relationship,
                    direction,
                    groupPath
                )
            )
            .setMethod('PUT')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async createComponent(
        deviceId: string,
        body: Device10Resource | Device20Resource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedComponentsRelativeUrl(deviceId))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(body);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async createDevice(
        body: Device10Resource | Device20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.devicesRelativeUrl())
            .setQueryStringParameters({ applyProfile: applyProfileId })
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(body);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async bulkCreateDevice(
        body: BulkDevicesResource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<BulkDevicesResult> {
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

    async bulkUpdateDevice(
        body: BulkDevicesResource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
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

    async deleteComponent(
        deviceId: string,
        componentId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(componentId, 'componentId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedComponentRelativeUrl(deviceId, componentId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async deleteDevice(deviceId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceRelativeUrl(deviceId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async detachFromDevice(
        deviceId: string,
        relationship: string,
        otherDeviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedDeviceRelativeUrl(deviceId, relationship, otherDeviceId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async detachFromDevices(
        deviceId: string,
        relationship: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        if (relationship === undefined) {
            relationship = '*';
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedDevicesRelativeUrl(deviceId, relationship))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async detachFromAllDevices(
        deviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        await this.detachFromDevices(deviceId, undefined, additionalHeaders);
    }

    async detachFromDeviceWithDirection(
        deviceId: string,
        relationship: string,
        direction: string,
        otherDeviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.nonEmpty);
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(
                super.deviceAttachedDirectionalDeviceRelativeUrl(
                    deviceId,
                    relationship,
                    direction,
                    otherDeviceId
                )
            )
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async detachFromGroup(
        deviceId: string,
        relationship: string,
        groupPath: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedGroupRelativeUrl(deviceId, relationship, groupPath))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async detachFromGroups(
        deviceId: string,
        relationship: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        if (relationship === undefined) {
            relationship = '*';
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceAttachedGroupsRelativeUrl(deviceId, relationship))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async detachFromAllGroups(
        deviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        await this.detachFromGroups(deviceId, undefined, additionalHeaders);
    }

    async detachFromGroupWithDirection(
        deviceId: string,
        relationship: string,
        direction: string,
        groupPath: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.nonEmpty);
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(
                super.deviceAttachedDirectionalGroupRelativeUrl(
                    deviceId,
                    relationship,
                    direction,
                    groupPath
                )
            )
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async getDeviceByID(
        deviceId: string,
        expandComponents?: boolean,
        attributes?: string[],
        groups?: string[],
        additionalHeaders?: RequestHeaders
    ): Promise<Device10Resource | Device20Resource> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        const attributes_qs = attributes ? attributes.join() : undefined;
        const groups_qs = groups ? groups.join() : undefined;

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

    async updateComponent(
        deviceId: string,
        componentId: string,
        body: Device10Resource | Device20Resource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
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

    async updateDevice(
        deviceId: string,
        body: Device10Resource | Device20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deviceRelativeUrl(deviceId))
            .setMethod('PATCH')
            .setQueryStringParameters({
                applyProfile: applyProfileId,
            })
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async getDevicesByID(
        deviceIds: string[],
        expandComponents?: boolean,
        attributes?: string[],
        groups?: string[],
        additionalHeaders?: RequestHeaders
    ): Promise<DeviceResourceList> {
        ow(deviceIds, 'deviceIds', ow.array.nonEmpty.minLength(1));

        const attributes_qs = attributes ? attributes.join() : undefined;
        const groups_qs = groups ? groups.join() : undefined;

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
