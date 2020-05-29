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

        if (request.taskInfo.status==='Failure') {
            return super.handle(request);
        }

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
