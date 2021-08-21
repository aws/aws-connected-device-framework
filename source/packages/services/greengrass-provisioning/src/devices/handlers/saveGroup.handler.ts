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
import { injectable, inject } from 'inversify';
import {AbstractDeviceAssociationHandler} from './handler';
import {DeviceAssociationModel} from './models';
import {TYPES} from '../../di/types';
import {GroupsDao} from '../../groups/groups.dao';
import {DevicesDao} from '../devices.dao';
import ow from 'ow';
import {logger} from '../../utils/logger.util';

@injectable()
export class SaveGroupHandler extends AbstractDeviceAssociationHandler {

    constructor(
        @inject(TYPES.DevicesDao) private devicesDao: DevicesDao,
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDao ) {
        super();
    }

    public async handle(request: DeviceAssociationModel): Promise<DeviceAssociationModel> {
        logger.debug(`saveGroup.handler handle: in: request:${JSON.stringify(request)}`);

        ow(request?.taskInfo?.status, ow.string.nonEmpty);

        // determine the overall task status if we have not already determined it so far
        if (request.taskInfo.status==='InProgress') {
            if (request.taskInfo.devices.filter(d=> d.status==='Failure').length>0) {
                request.taskInfo.status = 'Failure';
            } else {
                request.taskInfo.status = 'Success';
            }
        }

        // save details of the task and new versions created
        await this.devicesDao.saveDeviceAssociationTask(request.taskInfo);

        if (request.updatedGroupVersionId!==undefined) {
            request.group.deployed = false;
            request.group.versionId = request.updatedGroupVersionId;
            request.group.versionNo = (request.group.versionNo ?? 0) + 1;
            await this.groupsDao.saveGroup(request.group);
        }

        logger.debug(`saveGroup.handler handle: request:${JSON.stringify(request)}`);
        return super.handle(request);
    }

}
