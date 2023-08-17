import { Artifact, CdfProvisioningParameters } from './cores.model';

export interface NewDeviceTask {
    coreName: string;
    devices: Device[];
    type: DeviceTaskType;
    options?: DeleteDeviceTaskOptions;
}

export interface DeleteDeviceTaskOptions {
    deprovisionClientDevices: boolean;
}

export interface DeviceTask {
    id: string;
    devices: Device[];
    type: DeviceTaskType;
    options?: DeleteDeviceTaskOptions;
    taskStatus: DeviceTaskStatus;
    statusMessage?: string;
    createdAt: Date;
    updatedAt?: Date;
}

export interface Device {
    name: string;
    createdAt: Date;
    updatedAt?: Date;
    taskStatus?: DeviceTaskStatus;
    statusMessage?: string;
    coreName: string;
    provisioningTemplate: string;
    provisioningParameters: { [key: string]: string };
    cdfProvisioningParameters: CdfProvisioningParameters;
    artifacts?: {
        [key: string]: Artifact;
    };
}

export type DeviceTaskStatus = 'Waiting' | 'InProgress' | 'Success' | 'Failure';

export type DeviceTaskType = 'Create' | 'Delete';
