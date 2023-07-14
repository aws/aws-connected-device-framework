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

/* tslint:disable:no-unused-variable member-ordering */
import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { QSHelper } from '../utils/qs.helper';
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
export class DevicesApigwService extends DevicesServiceBase implements DevicesService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.ASSETLIBRARY_BASE_URL;
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

        const url = `${this.baseUrl}${super.deviceAttachedDeviceRelativeUrl(
            deviceId,
            relationship,
            otherDeviceId
        )}`;
        return await request
            .put(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        const url = `${this.baseUrl}${super.deviceAttachedDirectionalDeviceRelativeUrl(
            deviceId,
            relationship,
            direction,
            otherDeviceId
        )}`;
        return await request
            .put(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        const url = `${this.baseUrl}${super.deviceAttachedGroupRelativeUrl(
            deviceId,
            relationship,
            groupPath
        )}`;
        return await request
            .put(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        const url = `${this.baseUrl}${super.deviceAttachedDirectionalGroupRelativeUrl(
            deviceId,
            relationship,
            direction,
            groupPath
        )}`;
        return await request
            .put(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async createComponent(
        deviceId: string,
        body: Device10Resource | Device20Resource,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.deviceAttachedComponentsRelativeUrl(deviceId)}`;
        return await request
            .post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async createDevice(
        body: Device10Resource | Device20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.devicesRelativeUrl()}`;
        const queryString = QSHelper.getQueryString({ applyProfile: applyProfileId });
        if (queryString) {
            url += `?${queryString}`;
        }

        const headers = this.buildHeaders(additionalHeaders);
        return await request
            .post(url)
            .send(body)
            .set(headers)
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async bulkCreateDevice(
        body: BulkDevicesResource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<BulkDevicesResult> {
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.bulkDevicesRelativeUrl()}`;
        const queryString = QSHelper.getQueryString({ applyProfile: applyProfileId });
        if (queryString) {
            url += `?${queryString}`;
        }
        return await request
            .post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async bulkUpdateDevice(
        body: BulkDevicesResource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.bulkDevicesRelativeUrl()}`;
        const queryString = QSHelper.getQueryString({ applyProfile: applyProfileId });
        if (queryString) {
            url += `?${queryString}`;
        }
        return await request
            .patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteComponent(
        deviceId: string,
        componentId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(componentId, 'componentId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deviceAttachedComponentRelativeUrl(
            deviceId,
            componentId
        )}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteDevice(deviceId: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deviceRelativeUrl(deviceId)}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        const url = `${this.baseUrl}${super.deviceAttachedDeviceRelativeUrl(
            deviceId,
            relationship,
            otherDeviceId
        )}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        const url = `${this.baseUrl}${super.deviceAttachedDevicesRelativeUrl(
            deviceId,
            relationship
        )}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async detachFromAllDevices(
        deviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        return await this.detachFromDevices(deviceId, undefined, additionalHeaders);
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

        const url = `${this.baseUrl}${super.deviceAttachedDirectionalDeviceRelativeUrl(
            deviceId,
            relationship,
            direction,
            otherDeviceId
        )}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        const url = `${this.baseUrl}${super.deviceAttachedGroupRelativeUrl(
            deviceId,
            relationship,
            groupPath
        )}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        const url = `${this.baseUrl}${super.deviceAttachedGroupsRelativeUrl(
            deviceId,
            relationship
        )}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async detachFromAllGroups(
        deviceId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        return await this.detachFromGroups(deviceId, undefined, additionalHeaders);
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

        const url = `${this.baseUrl}${super.deviceAttachedDirectionalGroupRelativeUrl(
            deviceId,
            relationship,
            direction,
            groupPath
        )}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        let url = `${this.baseUrl}${super.deviceRelativeUrl(deviceId)}`;
        const queryString = QSHelper.getQueryString({
            expandComponents,
            attributes: attributes_qs,
            includeGroups: groups_qs,
        });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        const url = `${this.baseUrl}${super.deviceAttachedComponentRelativeUrl(
            deviceId,
            componentId
        )}`;

        return await request
            .patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async updateDevice(
        deviceId: string,
        body: Device10Resource | Device20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.deviceRelativeUrl(deviceId)}`;
        const queryString = QSHelper.getQueryString({ applyProfile: applyProfileId });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
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

        let url = `${this.baseUrl}${super.bulkDevicesRelativeUrl()}`;
        const queryString = QSHelper.getQueryString({
            deviceIds: deviceIds.join(','),
            expandComponents,
            attributes: attributes_qs,
            includeGroups: groups_qs,
        });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
