/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Pagination } from './pagination.model';

/**
 * Connected Device Framework: Dashboard Facade
 */

export interface Device {
    /**
     * Globally unique id of the Device.
     */
    deviceId?: string;
    /**
     * Category, always `device` for a device.
     */
    category?: string;
    /**
     * Template of Device.
     */
    templateId?: string;
    /**
     * Description of the group.
     */
    description?: string;
    /**
     * Arn of the device if registered within the AWS IoT registry.
     */
    awsIotThingArn?: string;
    /**
     * URL of an image of the device.
     */
    imageUrl?: string;
    /**
     * Paths of the groups that this Device is associated with.
     */
    groups?: { [key: string]: string[]; };
    /**
     * Ids of the devices that this Device is associated with.
     */
    devices?: { [key: string]: string[]; };
    /**
     * The device that this Device is a component of.
     */
    assemblyOf?: Device;
    /**
     * Whether the device is reported as connected or not.
     */
    connected?: boolean;
    /**
     * The state of the device
     */
    state?: DeviceState;
    /**
     * The device components that this Device is assembled of.
     */
    components?: Device[];
    attributes?: { [key: string]: string | number | boolean; };
}

export interface BulkDevices {
    devices: Device[];
}

export interface DeviceList {
    results?: Device[];
    pagination?: Pagination;
}

export enum DeviceState {
    Unprovisioned = 'unprovisioned',
    Active = 'active',
    Decommisioned = 'decommisioned',
    Retired = 'retired'
}

export class BulkDevicesResult {
    success: number;
    failed: number;
    total: number;
    errors: {[key:string]:string};
}
