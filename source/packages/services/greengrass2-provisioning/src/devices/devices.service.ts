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
import { inject, injectable } from "inversify";
import { DeviceTaskItem } from "../deviceTasks/deviceTasks.model";
import { logger } from "../utils/logger.util";
import { DeviceEventPayload, DeviceItem, DevicesEvent } from "./devices.model";
import ow from 'ow';
import { TYPES } from "../di/types";
import { DeviceTasksDao } from "../deviceTasks/deviceTasks.dao";
import { DescribeThingCommand, IoTClient } from "@aws-sdk/client-iot";
import { BatchAssociateClientDeviceWithCoreDeviceCommand, BatchDisassociateClientDeviceFromCoreDeviceCommand, GreengrassV2Client } from "@aws-sdk/client-greengrassv2";
import {
    PROVISIONING_CLIENT_TYPES, ProvisionThingRequest, ProvisionThingResponse, ThingsService
} from '@cdf/provisioning-client';
import AdmZip from "adm-zip";
import { S3Utils } from "../utils/s3.util";
import { DevicesDao } from "./devices.dao";
import pLimit from "p-limit";
import { CDFEventPublisher, EVENT_PUBLISHER_TYPES } from "@cdf/event-publisher";

@injectable()
export class DevicesService {

    private iot: IoTClient;
    private greengrassV2: GreengrassV2Client;

    public constructor(
        @inject(TYPES.S3Utils) private s3Utils: S3Utils,
        @inject(TYPES.DeviceTasksDao) private deviceTasksDao: DeviceTasksDao,
        @inject(TYPES.DevicesDao) private devicesDao: DevicesDao,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private thingsService: ThingsService,
        @inject(TYPES.IotFactory) iotFactory: () => IoTClient,
        @inject(TYPES.Greengrassv2Factory) ggv2Factory: () => GreengrassV2Client,
        @inject(EVENT_PUBLISHER_TYPES.CDFEventPublisher) private cdfEventPublisher: CDFEventPublisher
    ) {
        this.iot = iotFactory();
        this.greengrassV2 = ggv2Factory();
    }

    public async get(name: string): Promise<DeviceItem> {
        logger.debug(`devices.service get: in: name:${name}`);

        ow(name, ow.string.nonEmpty);

        const device = await this.devicesDao.get(name);

        const response = device;
        if (response === undefined) {
            return undefined;
        }

        logger.debug(`devices.service get: exit: ${JSON.stringify(response)}`);
        return response;
    }

    public async disassociateDevicesFromCore(task: DeviceTaskItem, devices: DeviceItem[], coreName: string): Promise<DeviceItem[]> {

        logger.debug(`devices.service disassociateDevicesFromCore: in: devices:${JSON.stringify(devices)}, coreName: ${JSON.stringify(coreName)}`);

        ow(devices, ow.array.minLength(1))
        ow(coreName, ow.string.nonEmpty)


        const response = await this.greengrassV2.send(new BatchDisassociateClientDeviceFromCoreDeviceCommand({
            coreDeviceThingName: coreName,
            // We only disassociate things that are successfully deleted
            entries: devices.map(o => { return { thingName: o.name } })
        }))

        if (response.errorEntries.length > 0) {
            logger.warn(`devices.service disassociateDevicesFromCore: there are some error when disassociating devices: ${JSON.stringify(devices)} with core: ${coreName}, errorEntries:${JSON.stringify(response.errorEntries)}`)
            const saveTaskDetailsFuture = devices.filter(o => o.taskStatus === 'Success')
                .filter(device => response.errorEntries.find(o => o.thingName === device.name) !== undefined)
                .map(device => {
                    device.taskStatus = 'Failure'
                    device.updatedAt = new Date()
                    device.statusMessage = `Client device cannot be disassociated with core ${coreName}`
                    return this.deviceTasksDao.saveTaskDetail(task.id, device);
                })
            await Promise.all(saveTaskDetailsFuture)
        }

        logger.debug(`devices.service disassociateDevicesFromCore: exit: devices:${JSON.stringify(devices)}`);
        return devices;
    }

    public async associateDevicesWithCore(task: DeviceTaskItem, devices: DeviceItem[], coreName: string): Promise<DeviceItem[]> {
        logger.debug(`devices.service associateDevicesWithCore: in: devices:${JSON.stringify(devices)}, coreName: ${JSON.stringify(coreName)}`);

        ow(devices, ow.array.minLength(1))
        ow(coreName, ow.string.nonEmpty)

        const response = await this.greengrassV2.send(new BatchAssociateClientDeviceWithCoreDeviceCommand({
            coreDeviceThingName: coreName,
            // We only associate things that are successfully created
            entries: devices.filter(o => o.taskStatus === 'Success').map(o => { return { thingName: o.name } })
        }))

        if (response.errorEntries) {
            logger.warn(`devices.service associateDevicesWithCore: there are some error when associating devices: ${JSON.stringify(devices)} with core: ${coreName}`)
            const saveTaskDetailsFuture = devices.filter(o => o.taskStatus === 'Success')
                .filter(device => response.errorEntries.find(o => o.thingName === device.name) !== undefined)
                .map(device => {
                    device.taskStatus = 'Failure'
                    device.updatedAt = new Date()
                    device.statusMessage = `Client device cannot be associated with core ${coreName}`
                    return this.deviceTasksDao.saveTaskDetail(task.id, device);
                })
            await Promise.all(saveTaskDetailsFuture)
        }

        logger.debug(`devices.service associateDevicesWithCore: exit: devices:${JSON.stringify(devices)}`);
        return devices;
    }

    public async deleteDevices(task: DeviceTaskItem, devices: DeviceItem[]): Promise<DeviceItem[]> {
        logger.debug(`devices.service deleteDevices: in: task:${JSON.stringify(task)}, devices: ${JSON.stringify(devices)}`);

        // fail fast if invalid request
        ow(devices, ow.array.minLength(1));

        const futures: Promise<DeviceItem>[] = [];
        const limit = pLimit(parseInt(process.env.PROMISES_CONCURRENCY));
        for (const c of devices) {
            futures.push(
                limit(async () => {
                    let processed: DeviceItem;
                    try {
                        processed = await this.deleteDeviceByTask(task, c, task.options?.deprovisionClientDevices);
                    } catch (e) {
                        logger.error(`devices.service deleteDevices: error: ${e.name}: ${e.message}`);
                        processed = {
                            ...c,
                            taskStatus: 'Failure',
                            statusMessage: e.message,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                    return processed;
                })
            );
        }

        const results = await Promise.all(futures);
        logger.debug(`devices.service deleteDevices: exit: ${JSON.stringify(results)}`);
        return results;
    }

    public async createDevices(task: DeviceTaskItem, devices: DeviceItem[]): Promise<DeviceItem[]> {
        logger.debug(`devices.service createDevices: in: task:${JSON.stringify(task)}, devices: ${JSON.stringify(devices)}`);

        // fail fast if invalid request
        ow(devices, ow.array.minLength(1));

        const futures: Promise<DeviceItem>[] = [];
        const limit = pLimit(parseInt(process.env.PROMISES_CONCURRENCY));
        for (const c of devices) {
            futures.push(
                limit(async () => {
                    let processed: DeviceItem;
                    try {
                        processed = await this.createDevice(task, c);
                    } catch (e) {
                        logger.error(`devices.service createDevices: error: ${e.name}: ${e.message}`);
                        processed = {
                            ...c,
                            taskStatus: 'Failure',
                            statusMessage: e.message,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                    return processed;
                })
            );
        }

        const results = await Promise.all(futures);
        logger.debug(`devices.service createDevices: exit: ${JSON.stringify(results)}`);
        return results;
    }
    public async createDevice(task: DeviceTaskItem, request: DeviceItem): Promise<DeviceItem> {
        logger.debug(`devices.service createDevice: in: task:${JSON.stringify(task)}, request:${JSON.stringify(request)}`);

        // fail fast if invalid request
        ow(request?.name, 'client device name', ow.string.nonEmpty);
        ow(request?.provisioningTemplate, 'client device provisioning template', ow.string.nonEmpty);

        // save as in progress
        const device: DeviceItem = {
            ...request,
            taskStatus: 'InProgress',
            createdAt: new Date(),
            updatedAt: new Date()
        }
        await this.deviceTasksDao.saveTaskDetail(task.id, device);

        // determine if core is already registered with ggv2
        let thingAlreadyExists = true;
        try {
            await this.iot.send(new DescribeThingCommand({
                thingName: device.name
            }));
        } catch (e) {
            if (e.name === 'ResourceNotFoundException') {
                thingAlreadyExists = false;
            }
        }

        if (thingAlreadyExists) {
            logger.warn(`devices.service createCore: device: ${device.name} already registered with AWS IoT`);
            device.taskStatus = 'Success';
            device.statusMessage = 'Client device already registered';
            device.updatedAt = new Date();
        } else {
            await this.createThingIfNotExist(device)
        }

        // if we reach here and still in-progress, we have successfully finished creating the core device
        if (device.taskStatus === 'InProgress') {
            device.taskStatus = 'Success';
            device.updatedAt = new Date();

            await this.cdfEventPublisher.emitEvent<DeviceEventPayload>({
                name: DevicesEvent,
                payload: {
                    taskId: task.id,
                    deviceName: device.name,
                    status: 'success',
                    operation: 'create'
                }
            })
        }

        if (device.taskStatus === 'Failure') {
            await this.cdfEventPublisher.emitEvent<DeviceEventPayload>({
                name: DevicesEvent,
                payload: {
                    taskId: task.id,
                    deviceName: device.name,
                    status: 'failed',
                    operation: 'create',
                    errorMessage: device.statusMessage
                }
            })
        }

        // save final state
        await this.deviceTasksDao.saveTaskDetail(task.id, device);

        logger.debug(`devices.service createCore: exit: ${JSON.stringify(device)}`);
        return device;
    }

    /**
        * Determine if a thing has already been registered to represent this core. If not, provison it.
        * @param core
        */
    private async createThingIfNotExist(device: DeviceItem): Promise<void> {
        logger.debug(`devices.service: createThingIfNotExist: in: device:${JSON.stringify(device)}`);
        let thingExists = true;
        try {
            await this.iot.send(new DescribeThingCommand({
                thingName: device.name
            }));
        } catch (e) {
            if (e.name === 'ResourceNotFoundException') {
                thingExists = false;
            }
        }
        if (!thingExists) {
            logger.debug(`devices.service createThingIfNotExist: provisioning thing for core: ${device.name}`);
            let res: ProvisionThingResponse;
            try {
                const req: ProvisionThingRequest = {
                    provisioningTemplateId: device.provisioningTemplate,
                    parameters: device.provisioningParameters,
                    cdfProvisioningParameters: device.cdfProvisioningParameters
                };
                logger.silly(`devices.service createThingIfNotExist: provisioning: req:${JSON.stringify(req)}`);
                res = await this.thingsService.provisionThing(req);
                logger.silly(`devices.service createThingIfNotExist: provisioning: res:${JSON.stringify(res)}`);
            } catch (err) {
                logger.error(`devices.service createThingIfNotExist: provisioning: err:${err}`);
                device.taskStatus = 'Failure';
                device.statusMessage = `Failed provisioning: ${err}`;
            }

            // if CDF has created certificates on behalf of the device, we need to store these for later retrieval by the device
            if (res?.certificatePem !== undefined) {
                try {
                    const [bucket, key] = await this.uploadCerts(device.name, res.certificatePem, res.privateKey);
                    if (!device.artifacts) {
                        device.artifacts = {};
                    }
                    device.artifacts.certs = {
                        bucket,
                        key,
                        createdAt: new Date()
                    };
                } catch (err) {
                    logger.error(`devices.service createThingIfNotExist: failed uploading certs:  err:${err}`);
                    device.taskStatus = 'Failure';
                    device.statusMessage = `Failed uploading certs: ${err}`;
                }
            }
        } else {
            device.taskStatus = 'Success';
            device.statusMessage = 'Client device thing already provisioned';
        }
        device.updatedAt = new Date();
        logger.debug(`devices.service: createThingIfNotExist: exit:`);
    }

    private async uploadCerts(thingName: string, certificate: string, privateKey?: string): Promise<[string, string]> {
        logger.debug(`devices.service: uploadCerts: in: coreName:${thingName}`);

        const zip = new AdmZip();
        zip.addFile('certs/', Buffer.from(''));
        zip.addFile(`certs/cert.pem`, Buffer.from(certificate));

        if (privateKey) {
            zip.addFile(`certs/private.key`, Buffer.from(privateKey));
        }

        const bucket = process.env.AWS_S3_ARTIFACTS_BUCKET;
        const prefix = process.env.AWS_S3_ARTIFACTS_PREFIX;

        const s3Key = `${prefix}${thingName}/${thingName}/certs.zip`;
        await this.s3Utils.uploadStreamToS3(bucket, s3Key, zip.toBuffer());

        const response: [string, string] = [bucket, s3Key];
        logger.debug(`devices.service: uploadCerts: exit: ${JSON.stringify(response)}`);
        return response;
    }


    public async deleteDeviceByTask(task: DeviceTaskItem, device: DeviceItem, deprovisionDevice: boolean): Promise<DeviceItem> {
        logger.debug(`devices.service deleteDeviceByTask: in: task:${JSON.stringify(task)}, device:${JSON.stringify(device)}, deprovisionCore:${deprovisionDevice}`);

        const deviceItem: DeviceItem = {
            ...device,
            taskStatus: 'InProgress',
            createdAt: new Date(),
            updatedAt: new Date()
        }
        await this.deviceTasksDao.saveTaskDetail(task.id, deviceItem);

        await this.deleteDevice(device.name, deprovisionDevice)

        // if we reach here and still in-progress, we have successfully finished creating the core device
        if (deviceItem.taskStatus === 'InProgress') {
            deviceItem.taskStatus = 'Success';
            deviceItem.updatedAt = new Date();
            await this.cdfEventPublisher.emitEvent<DeviceEventPayload>({
                name: DevicesEvent,
                payload: {
                    taskId: task.id,
                    deviceName: device.name,
                    status: 'success',
                    operation: 'delete'
                }
            })
        }

        if (deviceItem.taskStatus === 'Failure') {
            await this.cdfEventPublisher.emitEvent<DeviceEventPayload>({
                name: DevicesEvent,
                payload: {
                    taskId: task.id,
                    deviceName: device.name,
                    status: 'failed',
                    operation: 'delete',
                    errorMessage: deviceItem.statusMessage
                }
            })
        }

        // save final state
        await this.deviceTasksDao.saveTaskDetail(task.id, deviceItem);
        logger.debug(`devices.service deleteDevice: exit:`);
        return deviceItem
    }

    public async deleteDevice(deviceName: string, deprovisionDevice: boolean, disassociateDeviceFromCore = false): Promise<DeviceItem> {
        logger.debug(`devices.service deleteDevice: in: deviceName:${JSON.stringify(deviceName)}, deprovisionDevice:${deprovisionDevice}`);

        // fail fast if invalid request
        ow(deviceName, 'device name', ow.string.nonEmpty);

        // get core
        const device = await this.devicesDao.get(deviceName);
        if (!device) {
            throw new Error(`DEVICE_NOT_FOUND`);
        }

        // if requested, deprovision the core device
        if (deprovisionDevice) {
            try {
                await this.thingsService.deleteThing(device.name);
            } catch (e) {
                logger.error(`devices.service deleteDevice: deleting client device thing failed: ${e}`);
            }
        }

        // remove the core from this service
        try {
            await this.devicesDao.delete(device.name);
        } catch (e) {
            logger.error(`devices.service deleteDevice: deleting client device dao  failed: ${e}`);
        }

        // diassociateDeviceFrom core
        if (disassociateDeviceFromCore) {
            await this.greengrassV2.send(new BatchDisassociateClientDeviceFromCoreDeviceCommand({
                coreDeviceThingName: device.coreName,
                entries: [{ thingName: deviceName }]
            }))
        }

        logger.debug(`devices.service deleteDevice: exit:`);

        return device;
    }
}
