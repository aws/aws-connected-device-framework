import { injectable, inject } from 'inversify';
import {AbstractDeviceAssociationHandler} from './handler';
import {DeviceAssociationModel} from './models';
import ow from 'ow';
import {logger} from '../../utils/logger.util';
import {TYPES} from '../../di/types';
import {GreengrassSubscriptionItem} from '../../subscriptions/subscriptions.models';
import {GreengrassUtils} from '../../utils/greengrass.util';
import {SubscriptionsService} from '../../subscriptions/subscriptions.service';

@injectable()
export class CreateGroupVersionHandler extends AbstractDeviceAssociationHandler {

    constructor(
        @inject(TYPES.GreengrassUtils) private ggUtils: GreengrassUtils,
        @inject(TYPES.SubscriptionsService) private subscriptionsService: SubscriptionsService) {
        super();
    }

    public async handle(request: DeviceAssociationModel): Promise<DeviceAssociationModel> {
        logger.debug(`createGroupVersion.handler handle: in: request:${JSON.stringify(request)}`);

        ow(request?.taskInfo?.status, ow.string.nonEmpty);

        if (request.taskInfo.status==='Failure') {
            return super.handle(request);
        }

        ow( request?.taskInfo, ow.object.nonEmpty);
        ow( request.ggGroup?.Id, ow.string.nonEmpty);
        ow( request.ggGroupVersion, ow.object.nonEmpty);
        ow( request.ggCoreVersion?.Cores, ow.array);
        ow( request.ggDeviceVersion?.Devices, ow.array);

        let coreInfoChanged = false;
        let deviceInfoChanged = false;
        const subscriptions:GreengrassSubscriptionItem[]= [];

        for (const device of request.taskInfo.devices.filter((d=> d.status==='InProgress'))) {

            ow(device.thingName, ow.string.nonEmpty);
            ow(device.type, ow.string.nonEmpty);

            const thing = request.things[device.thingName];
            ow(thing, ow.object.nonEmpty);

            // if provisioned, and a cert is associated, we can associate it with the group

            const ggDevice : (AWS.Greengrass.Core | AWS.Greengrass.Device) = {
                CertificateArn: request.certificateArns[device.thingName],
                Id: thing.thingId,
                ThingArn: thing.thingArn,
                SyncShadow: device.syncShadow ?? true
            };
            if (device.type==='core') {
                request.ggCoreVersion.Cores.push(ggDevice);
                coreInfoChanged=true;
            } else {
                request.ggDeviceVersion.Devices.push(ggDevice);
                deviceInfoChanged=true;
            }

            // any subscriptions to process?
            if (device.subscriptions?.length>0) {
                subscriptions.push(... device.subscriptions);
            }

            device.status = 'Success';
        }

        // commit any Greengrass device/core updates
        try {
            let updatedCoresVersionArn;
            if (coreInfoChanged) {
                updatedCoresVersionArn = await this.ggUtils.createCoreDefinitionVersion(
                    request.ggGroupVersion.CoreDefinitionVersionArn, request.ggCoreVersion);
            }
            let updatedDevicesVersionArn;
            if (deviceInfoChanged) {
                updatedDevicesVersionArn = await this.ggUtils.createDeviceDefinitionVersion(
                    request.ggGroupVersion.DeviceDefinitionVersionArn, request.ggDeviceVersion);
            }
            let updatedSubscriptionsVersionArn;
            if (subscriptions.length>0) {
                updatedSubscriptionsVersionArn = await this.subscriptionsService.createSubscriptionDefinitionVersion(
                    request.ggGroupVersion.SubscriptionDefinitionVersionArn, subscriptions, []);
            }

            if (coreInfoChanged || deviceInfoChanged || updatedSubscriptionsVersionArn!==undefined) {
                request.updatedGroupVersionId = await this.ggUtils.createGroupVersion(request.ggGroup.Id, request.ggGroupVersion,
                    updatedCoresVersionArn, updatedDevicesVersionArn, updatedSubscriptionsVersionArn);
            }
        } catch (err) {
            logger.error(`createGroupVersion.handler handle: failed updating greengrass definitions:  err:${err}`);
            request.taskInfo.status = 'Failure';
            request.taskInfo.statusMessage = err.message;
        }

        logger.debug(`createGroupVersion.handler handle: exit:${JSON.stringify(request)}`);
        return super.handle(request);
    }

}
