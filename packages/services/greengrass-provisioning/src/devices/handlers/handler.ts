import {DeviceAssociationModel} from './models';
import { injectable } from 'inversify';

export interface DeviceAssociationHandler {
    setNext(handler: DeviceAssociationHandler): DeviceAssociationHandler;
    handle(request: DeviceAssociationModel) : Promise<DeviceAssociationModel>;
}

@injectable()
export abstract class AbstractDeviceAssociationHandler implements DeviceAssociationHandler {

    private nextHandler: DeviceAssociationHandler;

    public setNext(handler: DeviceAssociationHandler): DeviceAssociationHandler {
        this.nextHandler = handler;
        return handler;
    }

    public async handle(request: DeviceAssociationModel): Promise<DeviceAssociationModel> {
        if (this.nextHandler) {
            return this.nextHandler.handle(request);
        }
        return request;
    }
}
