/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/* tslint:disable:no-unused-variable member-ordering */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { DevicesService, DevicesServiceBase } from './devices.service';
import { Device, DeviceTaskSummary } from './devices.model';

@injectable()
export class DevicesApigwService extends DevicesServiceBase implements DevicesService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassProvisioning.baseUrl') as string;
    }

    async associateDevicesWithGroup(groupName:string, devices:Device[], additionalHeaders?:RequestHeaders) : Promise<DeviceTaskSummary> {
        ow(groupName, ow.string.nonEmpty);
        ow(devices, ow.array.minLength(1));

        const url = `${this.baseUrl}${super.deviceTasksRelativeUrl(groupName)}`;
        const res = await request.post(url)
            .send({devices})
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getDeviceAssociationTask(groupName:string, taskId: string, additionalHeaders?:RequestHeaders) : Promise<DeviceTaskSummary> {
        ow(groupName, ow.string.nonEmpty);
        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deviceTaskRelativeUrl(groupName, taskId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }
}
