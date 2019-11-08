/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { DeviceItem, BulkDevicesResult, DeviceItemList} from './devices.models';
import { GroupItemList } from '../groups/groups.models';

export interface DevicesService {

    get(deviceId:string, expandComponents?:boolean, attributes?:string[], includeGroups?:boolean): Promise<DeviceItem> ;

    getBulk(deviceIds:string[], expandComponents:boolean, attributes:string[], includeGroups:boolean) : Promise<DeviceItemList> ;

    createBulk(devices:DeviceItem[], applyProfile?:string) : Promise<BulkDevicesResult> ;

    create(model: DeviceItem, applyProfile?:string) : Promise<string> ;

    updateBulk(devices:DeviceItem[], applyProfile?:string) : Promise<BulkDevicesResult> ;

    update(model:DeviceItem, applyProfile?:string) : Promise<void> ;

    delete(deviceId: string) : Promise<void> ;

    attachToGroup(deviceId:string, relationship:string, direction:string, groupPath:string) : Promise<void> ;

    detachFromGroup(deviceId:string, relationship:string, direction:string, groupPath:string) : Promise<void> ;

    attachToDevice(deviceId:string, relationship:string, direction:string,  otherDeviceId:string) : Promise<void> ;

    detachFromDevice(deviceId:string, relationship:string, direction:string, otherDeviceId:string) : Promise<void> ;

    updateComponent(deviceId:string, componentId:string, model:DeviceItem) : Promise<void> ;

    deleteComponent(deviceId:string, componentId:string) : Promise<void> ;

    createComponent(parentDeviceId:string, model:DeviceItem) : Promise<string> ;

    listRelatedDevices(deviceId: string, relationship: string, direction:string, template:string, state:string, offset:number, count:number) : Promise<DeviceItemList>;

    listRelatedGroups(deviceId: string, relationship: string, direction:string, template:string, offset:number, count:number) : Promise<GroupItemList>;

}
