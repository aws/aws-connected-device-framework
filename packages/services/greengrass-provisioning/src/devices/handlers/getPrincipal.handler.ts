import { injectable, inject } from 'inversify';
import {AbstractDeviceAssociationHandler} from './handler';
import {DeviceAssociationModel} from './models';
import {logger} from '../../utils/logger.util';
import {TYPES} from '../../di/types';
import ow from 'ow';

@injectable()
export class GetPrincipalHandler extends AbstractDeviceAssociationHandler {

    private iot: AWS.Iot;

    constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
        super();
        this.iot = iotFactory();
    }

    public async handle(request: DeviceAssociationModel): Promise<DeviceAssociationModel> {
        logger.debug(`getPrincipal.handler handle: in: request:${JSON.stringify(request)}`);

        ow(request?.taskInfo?.status, ow.string.nonEmpty);

        if (request.taskInfo.status==='Failure') {
            return super.handle(request);
        }

        ow(request.taskInfo.devices, ow.array);

        if (request.certificateArns===undefined) {
            request.certificateArns= {};
        }

        for (const device of request.taskInfo.devices) {

            ow(device.thingName, ow.string.nonEmpty);

            // Retrieve the certificate associated with the device
            const certInfo = await this.iot.listThingPrincipals({thingName: device.thingName}).promise();

            // Make sure a cert is attached
            if (certInfo?.principals===undefined || certInfo.principals.length===0) {
                logger.warn(`devices.service associateDevicesWithGroup: device:${device.thingName} has no associated cert`);
                device.status = 'Failure';
                device.statusMessage = 'Registered Thing has no associated certificate';
                continue;
            }

            request.certificateArns[device.thingName] = certInfo.principals[0];

        }

        logger.debug(`getPrincipal.handler handle: request:${JSON.stringify(request)}`);
        return super.handle(request);
    }

}
