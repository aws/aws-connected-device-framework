/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

/* tslint:disable:no-unused-variable member-ordering */

import { Device, DeviceList, BulkDevices, BulkDevicesResult } from './devices.model';
import { injectable } from 'inversify';
import ow from 'ow';
import { PathHelper } from '../utils/path.helper';
import * as request from 'superagent';
import config from 'config';
import { QSHelper } from '../utils/qs.helper';

@injectable()
export class DevicesService  {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers:{[key:string]:string};

    private authToken:string;

    public constructor(authToken?:string) {
        this.baseUrl = config.get('assetLibrary.baseUrl') as string;

        if (config.has('assetLibrary.headers')) {
            const additionalHeaders: {[key:string]:string} = config.get('assetLibrary.headers') as {[key:string]:string};
            if (additionalHeaders !== null && additionalHeaders !== undefined) {
                this.headers = {...this.headers, ...additionalHeaders};
            }
        }

        this.setAuthToken(authToken);
    }

    public setAuthToken(authToken?:string) {
        this.authToken=authToken;
        this.getHeaders();
    }

    private getHeaders(): {[key:string]:string} {
        if (this.headers===undefined) {
            const h = {
                'Accept': this.MIME_TYPE,
                'Content-Type': this.MIME_TYPE
            };
            if (this.authToken!==undefined) {
                h['Authorization'] = `Bearer ${this.authToken}`;
            }
            this.headers=h;
        }
        return this.headers;
    }

    /**
     * Associates a device to another device, giving context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param otherDeviceId ID of device to create relationship to.
     */
    public async attachToDevice(deviceId: string, relationship: string, otherDeviceId: string): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(otherDeviceId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId, relationship, 'devices', otherDeviceId);
        await request.put(url)
            .set(this.getHeaders());
    }

    /**
     * Associates a device to a group, giving context to its relationship.
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param groupPath Path of group.
     */
    public async attachToGroup(deviceId: string, relationship: string, groupPath: string): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(groupPath, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId, relationship, 'groups', groupPath);
        await request.put(url)
            .set(this.getHeaders());
      }

    /**
     * Createa a new component and adds to the device.
     *
     * @param deviceId Id of parent device
     * @param body Device to add as a component
     */
    public async createComponent(deviceId: string, body: Device): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(body, ow.object.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId, 'components');
        await request.post(url)
            .send(body)
            .set(this.getHeaders());
    }

    /**
     * Add a new device to the asset library, adding it to the &#x60;/unprovisioned&#x60; group if no group is specified.
     *
     * @param body Device to add to the asset library
     */
    public async createDevice(body: Device, applyProfileId?:string): Promise<void> {
        ow(body, ow.object.nonEmpty);

        let url = this.baseUrl + '/devices';
        const queryString = QSHelper.getQueryString({applyProfile:applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }
        await request.post(url)
            .send(body)
            .set(this.getHeaders());
    }

    /**
     * Adds a batch of devices in bulk to the asset library, adding them to the &#x60;/unprovisioned&#x60; group if no groups are specified.
     *
     * @param body Device to add to the asset library
     */
    public async bulkCreateDevice(body: BulkDevices, applyProfileId?:string): Promise<BulkDevicesResult> {

        ow(body, ow.object.nonEmpty);

        let url = this.baseUrl + '/bulkdevices';
        const queryString = QSHelper.getQueryString({applyProfile:applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }
        const res = await request.post(url)
            .send(body)
            .set(this.getHeaders());

        return res.body;
    }

    public async bulkUpdateDevice(body: BulkDevices, applyProfileId?:string): Promise<void> {

        ow(body, ow.object.nonEmpty);

        let url = this.baseUrl + '/bulkdevices';
        const queryString = QSHelper.getQueryString({applyProfile:applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }
        await request.patch(url)
            .send(body)
            .set(this.getHeaders());
    }

    /**
     * Deletes a component of a devoce.
     *
     * @param deviceId Id of parent device
     * @param componentId ID of child component
     */
    public async deleteComponent(deviceId: string, componentId: string): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(componentId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId, 'components', componentId);

        await request.delete(url)
            .set(this.getHeaders());
    }

    /**
     * Delete device of specified ID
     * Deletes a single device
     * @param deviceId ID of device to return
     */
    public async deleteDevice(deviceId: string): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId,);

       await request.delete(url)
            .set(this.getHeaders());
    }

    /**
     * Removes a device from an associated device
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param otherDeviceId ID of device to create relationship to.
     */
    public async detachFromDevice(deviceId: string, relationship: string, otherDeviceId: string): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(otherDeviceId, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId, relationship, 'devices', otherDeviceId);

        await request.delete(url)
            .set(this.getHeaders());
    }

    /**
     * Removes a device from an associated group
     *
     * @param deviceId Id of device to attach to the group
     * @param relationship The relationship between the device and group. For example, this may reflect &#x60;locatedAt&#x60; or &#x60;manufacturedAt&#x60; relations.
     * @param groupPath Path of group.
     */
    public async detachFromGroup(deviceId: string, relationship: string, groupPath: string): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(groupPath, ow.string.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId, relationship, 'groups', groupPath);

         await request.delete(url)
            .set(this.getHeaders());
    }

    /**
     * Find device by ID
     * Returns a single device
     * @param deviceId ID of device to return
     * @param expandComponents By default, components of a device are not returned. Passing &#x60;true&#x60; will return and expand a devices components.
     */
    public async getDeviceByID(deviceId: string, expandComponents?: boolean, attributes?:string[], groups?:string[]): Promise<Device> {
        ow(deviceId, ow.string.nonEmpty);

        const attributes_qs = (attributes) ? attributes.join() : undefined;
        const groups_qs = (groups) ? groups.join() : undefined;

        let url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId);
        const queryString = QSHelper.getQueryString({expandComponents, attributes:attributes_qs, includeGroups:groups_qs});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.getHeaders());

        return res.body;
    }

    /**
     * Updates the component of a device.
     *
     * @param deviceId Id of parent device
     * @param componentId ID of child component
     */
    public async updateComponent(deviceId: string, componentId: string, body: Device): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(componentId, ow.string.nonEmpty);
        ow(body, ow.object.nonEmpty);

        const url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId, 'components', componentId);

        await request.patch(url)
            .send(body)
            .set(this.getHeaders());
    }

    /**
     * Update an existing device attributes
     *
     * @param deviceId ID of device to return
     * @param body Device object that needs to be updated in device store
     */
    public async updateDevice(deviceId: string, body: Device, applyProfileId?:string): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(body, ow.object.nonEmpty);

        let url = this.baseUrl + PathHelper.encodeUrl('devices', deviceId);
        const queryString = QSHelper.getQueryString({applyProfile:applyProfileId});
        if (queryString) {
            url += `?${queryString}`;
        }

        await request.patch(url)
            .send(body)
            .set(this.getHeaders());
    }

    /**
     * Find devices by ID
     * Returns mulitple devices
     * @param deviceIds IDs of device to return
     * @param expandComponents By default, components of a device are not returned. Passing &#x60;true&#x60; will return and expand a devices components.
     */
    public async getDevicesByID(deviceIds: string[], expandComponents?: boolean, attributes?:string[], groups?:string[]): Promise<DeviceList> {
        ow(deviceIds, ow.array.nonEmpty.minLength(1));

        const attributes_qs = (attributes) ? attributes.join() : undefined;
        const groups_qs = (groups) ? groups.join() : undefined;

        let url = '/bulkdevices';
        const queryString = QSHelper.getQueryString({deviceIds, expandComponents, attributes:attributes_qs, includeGroups:groups_qs});
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.getHeaders());

        return res.body;
    }

}
