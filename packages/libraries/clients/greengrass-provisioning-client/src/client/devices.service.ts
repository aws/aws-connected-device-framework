import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';
import { Device, DeviceTaskSummary } from './devices.model';

export interface DevicesService {

    associateDevicesWithGroup(groupName:string, devices:Device[], additionalHeaders?:RequestHeaders) : Promise<DeviceTaskSummary>;

    getDeviceAssociationTask(groupName:string, taskId: string, additionalHeaders?:RequestHeaders) : Promise<DeviceTaskSummary>;

}

@injectable()
export class DevicesServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected deviceTasksRelativeUrl(groupName:string) : string {
        return PathHelper.encodeUrl('groups', groupName, 'deviceTasks');
    }

    protected deviceTaskRelativeUrl(groupName:string, taskId:string) : string {
        return PathHelper.encodeUrl('groups', groupName, 'deviceTasks', taskId);
    }
}
