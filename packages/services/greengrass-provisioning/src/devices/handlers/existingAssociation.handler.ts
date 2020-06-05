import { injectable, inject } from 'inversify';
import {AbstractDeviceAssociationHandler} from './handler';
import {DeviceAssociationModel} from './models';
import {logger} from '../../utils/logger.util';
import ow from 'ow';

@injectable()
export class ExistingAssociationHandler extends AbstractDeviceAssociationHandler {

    constructor(
        @inject('aws.accountId') private accountId:string,
        @inject('aws.region') private region:string) {
        super();
    }

    public async handle(request: DeviceAssociationModel): Promise<DeviceAssociationModel> {
        logger.debug(`existingAssociation.handler handle: in: request:${JSON.stringify(request)}`);

        ow(request?.taskInfo?.status, ow.string.nonEmpty);

        if (request.taskInfo.status==='Failure') {
            return super.handle(request);
        }

        ow(request?.taskInfo?.devices, ow.array);
        ow(request?.ggCoreVersion?.Cores, ow.array);
        ow(request?.ggDeviceVersion?.Devices, ow.array);
        ow(request?.things, ow.object.nonEmpty);

        // ensure only 1 core has been specified
        const coreDevices = request.taskInfo.devices.filter(d=> d.type==='core');
        if (coreDevices.length>1) {
            request.taskInfo.status = 'Failure';
            request.taskInfo.statusMessage = 'More than 1 core was specified';
            coreDevices.forEach(d=> {
                d.status = 'Failure';
                d.statusMessage = request.taskInfo.statusMessage;
            });
            return super.handle(request);
        }

        let cores = request.ggCoreVersion.Cores;
        let devices = request.ggDeviceVersion.Devices;

        for (const device of request.taskInfo.devices) {

            ow(device.thingName, ow.string.nonEmpty);

            // is the device already registered as a thing?
            const thing = request.things[device.thingName];

            // is the device already associated with the group, and it's provisioned with AWS IoT?  if so, we can skip it.
            // it is possible for cores/devices to show as still associated with a group even if the thing itself is
            // deleted from AWS IoT, in which case we deassociate them first before proceeding.
            const thingArn = this.buildThingArn(device.thingName);
            if (device.type === 'core' && cores.filter(c => c.ThingArn === thingArn).length > 0) {
                if (thing === undefined) {
                    logger.warn(`existingAssociation.handler handle: removing ${device.thingName} as existing core as no longer exists as a thing`);
                    cores = cores.filter(c => c.ThingArn !== thingArn);
                } else {
                    logger.warn(`existingAssociation.handler handle: ignoring ${device.thingName} as already configured as the core`);
                    device.status = 'Success';
                    device.statusMessage = 'Already exists as the core';
                    continue;
                }
            } else if (device.type === 'device' && devices.filter(c => c.ThingArn === thingArn).length > 0) {
                if (thing === undefined) {
                    logger.warn(`existingAssociation.handler handle: removing ${device.thingName} as existing device as no longer exists as a thing`);
                    devices = devices.filter(d => d.ThingArn !== thingArn);
                } else {
                    logger.warn(`existingAssociation.handler handle: ignoring ${device.thingName} as already configured as the devicesInfo`);
                    device.status = 'Success';
                    device.statusMessage = 'Already exists as a device';
                    continue;
                }
            }
        }

        logger.debug(`existingAssociation.handler handle: request:${JSON.stringify(request)}`);
        return super.handle(request);
    }

    private buildThingArn(thingName:string) : string {
        return `arn:aws:iot:${this.region}:${this.accountId}:thing/${thingName}`;
    }

}
