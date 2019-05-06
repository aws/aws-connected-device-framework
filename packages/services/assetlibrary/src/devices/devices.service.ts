/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { DeviceModel, BulkDevicesResult, BulkDevicesRequest, DeviceListResult} from './devices.models';

export interface DevicesService {

    get(deviceId:string, includeComponents?:boolean, attributes?:string[], includeGroups?:boolean): Promise<DeviceModel> ;

    getBulk(deviceIds:string[], includeComponents:boolean, attributes:string[], includeGroups:boolean) : Promise<DeviceListResult> ;

    createBulk(request:BulkDevicesRequest, applyProfile?:string) : Promise<BulkDevicesResult> ;

    create(model: DeviceModel, applyProfile?:string) : Promise<string> ;

    updateBulk(request:BulkDevicesRequest, applyProfile?:string) : Promise<BulkDevicesResult> ;

    update(model:DeviceModel, applyProfile?:string) : Promise<void> ;

    delete(deviceId: string) : Promise<void> ;

    attachToGroup(deviceId:string, relationship:string, groupPath:string) : Promise<void> ;

    detachFromGroup(deviceId:string, relationship:string, groupPath:string) : Promise<void> ;

    attachToDevice(deviceId:string, relationship:string, otherDeviceId:string) : Promise<void> ;

    detachFromDevice(deviceId:string, relationship:string, otherDeviceId:string) : Promise<void> ;

    updateComponent(deviceId:string, componentId:string, model:DeviceModel) : Promise<void> ;

    deleteComponent(deviceId:string, componentId:string) : Promise<void> ;

    createComponent(parentDeviceId:string, model:DeviceModel) : Promise<string> ;

}
