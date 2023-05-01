import { injectable } from "inversify";
import { PathHelper } from "../utils/path.helper";
import { RequestHeaders } from "./common.model";
import { ClientServiceBase } from "./common.service";
import { Device, DeviceTask, NewDeviceTask } from "./devices.model";

export interface DevicesService {
    createDeviceTask(task: NewDeviceTask, additionalHeaders?: RequestHeaders): Promise<string>;

    getDeviceTask(taskId: string, additionaHeaders?: RequestHeaders): Promise<DeviceTask>;

    getDevice(name: string, additionaHeaders?: RequestHeaders): Promise<Device>;

    deleteDevice(name: string, additionaHeaders?: RequestHeaders): Promise<void>;
}

@injectable()
export class DevicesServiceBase extends ClientServiceBase {
    constructor() {
        super();
    }

    protected devicesRelativeUrl(): string {
        return '/devices';
    }

    protected deviceRelativeUrl(name: string): string {
        return PathHelper.encodeUrl('devices', name);
    }

    protected deviceTasksRelativeUrl(coreName: string): string {
        return `/cores/${coreName}/deviceTasks`;
    }

    protected deviceTaskRelativeUrl(taskId: string): string {
        return PathHelper.encodeUrl('deviceTasks', taskId);
    }
}
