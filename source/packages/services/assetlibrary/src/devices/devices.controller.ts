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
import { Request, Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    httpPatch,
    httpPost,
    httpPut,
    interfaces,
    queryParam,
    request,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';
import { assembleSortKeys } from '../data/model';
import { TYPES } from '../di/types';
import { GroupsAssembler } from '../groups/groups.assembler';
import { GroupResourceList } from '../groups/groups.models';
import { InvalidQueryStringError, handleError } from '../utils/errors';
import { logger } from '@awssolutions/simple-cdf-logger';
import { DevicesAssembler } from './devices.assembler';
import { Device10Resource, Device20Resource, DeviceResourceList } from './devices.models';
import { DevicesService } from './devices.service';

@controller('/devices')
export class DevicesController implements interfaces.Controller {
    constructor(
        @inject(TYPES.DevicesService) private devicesService: DevicesService,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
    ) {}

    @httpGet('/:deviceId')
    public async getDevice(
        @requestParam('deviceId') deviceId: string,
        @queryParam('expandComponents') components: string,
        @queryParam('attributes') attributes: string | string[],
        @queryParam('includeGroups') groups: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<Device10Resource | Device20Resource> {
        logger.info(`device.controller getDevice: in: deviceId:${deviceId}, components:${components}, attributes:${attributes},
            groups:${groups}, version:${req['version']}`);

        let attributesArray: string[];
        if (attributes !== undefined) {
            if (Array.isArray(attributes)) {
                attributesArray = attributes;
            } else if (typeof attributes === 'string') {
                attributesArray = attributes.split(',').filter((c) => c !== '');
            } else {
                attributesArray = `${attributes}`.split(',').filter((c) => c !== '');
            }
        }

        try {
            const includeGroups = groups !== 'false';
            const expandComponents = components !== 'false';
            const model = await this.devicesService.get(
                deviceId,
                expandComponents,
                attributesArray,
                includeGroups,
            );
            const resource = this.devicesAssembler.toDeviceResource(model, req['version']);
            logger.debug(`controller exit: ${JSON.stringify(resource)}`);

            if (model === undefined) {
                res.status(404).end();
            } else {
                return resource;
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpPost('')
    public async createDevice(
        @requestBody() device: Device10Resource | Device20Resource,
        @response() res: Response,
        @queryParam('applyProfile') applyProfile?: string,
    ): Promise<void> {
        logger.info(
            `device.controller  createDevice: in: device:${JSON.stringify(
                device,
            )}, applyProfile:${applyProfile}`,
        );
        try {
            const item = this.devicesAssembler.fromDeviceResource(device);
            await this.devicesService.create(item, applyProfile);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpPatch('/:deviceId')
    public async updateDevice(
        @requestBody() device: Device10Resource | Device20Resource,
        @response() res: Response,
        @requestParam('deviceId') deviceId: string,
        @queryParam('applyProfile') applyProfile?: string,
    ): Promise<void> {
        logger.info(
            `device.controller updateDevice: in: deviceId: ${deviceId}, device: ${JSON.stringify(
                device,
            )}, applyProfile:${applyProfile}`,
        );
        try {
            device.deviceId = deviceId;
            const item = this.devicesAssembler.fromDeviceResource(device);
            await this.devicesService.update(item, applyProfile);
            res.status(204).end();
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/:deviceId')
    public async deleteDevice(
        @response() res: Response,
        @requestParam('deviceId') deviceId: string,
    ): Promise<void> {
        logger.info(`device.controller deleteDevice: in: deviceId: ${deviceId}`);
        try {
            await this.devicesService.delete(deviceId);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpPut('/:deviceId/:relationship/groups/:groupPath')
    public async attachToGroup(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @requestParam('groupPath') groupPath: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller attachToGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`,
        );
        await this.attachToGroupWithDirection(deviceId, relationship, 'out', groupPath, res);
    }

    @httpDelete('/:deviceId/:relationship/groups/:groupPath')
    public async detachFromGroup(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @requestParam('groupPath') groupPath: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller detachFromGroup: in: deviceId:${deviceId}, relationship:${relationship}, groupPath:${groupPath}`,
        );
        await this.detachFromGroupWithDirection(deviceId, relationship, 'out', groupPath, res);
    }

    @httpDelete('/:deviceId/:relationship/groups')
    public async detachFromGroups(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller detachFromGroups: in: deviceId:${deviceId}, relationship:${relationship}`,
        );
        try {
            await this.devicesService.detachFromGroups(deviceId, relationship, undefined);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpPut('/:deviceId/:relationship/:direction/groups/:groupPath')
    public async attachToGroupWithDirection(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @requestParam('direction') direction: string,
        @requestParam('groupPath') groupPath: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller attachToGroupWithDirection: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`,
        );
        try {
            await this.devicesService.attachToGroup(deviceId, relationship, direction, groupPath);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/:deviceId/:relationship/:direction/groups/:groupPath')
    public async detachFromGroupWithDirection(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @requestParam('direction') direction: string,
        @requestParam('groupPath') groupPath: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller detachFromGroupWithDirection: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`,
        );
        try {
            await this.devicesService.detachFromGroup(
                deviceId,
                relationship,
                direction,
                groupPath,
            );
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:deviceId/:relationship/groups')
    public async listDeviceRelatedGroups(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @queryParam('direction') direction: string,
        @queryParam('template') template: string,
        @queryParam('offset') offset: number,
        @queryParam('count') count: number,
        @queryParam('sort') sort: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<GroupResourceList> {
        logger.info(
            `devices.controller listDeviceRelatedGroups: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}, sort:${sort}`,
        );

        let r: GroupResourceList = { results: [] };

        try {
            if (Array.isArray(direction)) {
                throw new InvalidQueryStringError(
                    'Only one `direction` query param can be provided.',
                );
            }
            if (Array.isArray(template)) {
                throw new InvalidQueryStringError(
                    'Only one `template` query param can be provided.',
                );
            }

            const sortKeys = assembleSortKeys(sort);
            const items = await this.devicesService.listRelatedGroups(
                deviceId,
                relationship,
                direction,
                template,
                offset,
                count,
                sortKeys,
            );
            if (r === undefined) {
                res.status(404);
            }

            r = this.groupsAssembler.toGroupResourceList(items, req['version']);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`devices.controller listDeviceRelatedGroups: exit: ${JSON.stringify(r)}`);
        return r;
    }

    @httpPut('/:deviceId/:relationship/devices/:otherDeviceId')
    public async attachToDevice(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @requestParam('otherDeviceId') otherDeviceId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller attachToDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`,
        );
        await this.attachToDeviceWithDirection(deviceId, relationship, 'out', otherDeviceId, res);
    }

    @httpDelete('/:deviceId/:relationship/devices/:otherDeviceId')
    public async detachFromDevice(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @requestParam('otherDeviceId') otherDeviceId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller detachFromDevice: in: deviceId:${deviceId}, relationship:${relationship}, otherDeviceId:${otherDeviceId}`,
        );
        await this.detachFromDeviceWithDirection(
            deviceId,
            relationship,
            'out',
            otherDeviceId,
            res,
        );
    }

    @httpDelete('/:deviceId/:relationship/devices')
    public async detachFromDevices(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller detachFromDevices: in: deviceId:${deviceId}, relationship:${relationship}`,
        );
        try {
            await this.devicesService.detachFromDevices(deviceId, relationship, undefined);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpPut('/:deviceId/:relationship/:direction/devices/:otherDeviceId')
    public async attachToDeviceWithDirection(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @requestParam('direction') direction: string,
        @requestParam('otherDeviceId') otherDeviceId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller attachToDeviceWithDirection: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`,
        );
        try {
            await this.devicesService.attachToDevice(
                deviceId,
                relationship,
                direction,
                otherDeviceId,
            );
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/:deviceId/:relationship/:direction/devices/:otherDeviceId')
    public async detachFromDeviceWithDirection(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @requestParam('direction') direction: string,
        @requestParam('otherDeviceId') otherDeviceId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller detachFromDeviceWithDirection: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`,
        );
        try {
            await this.devicesService.detachFromDevice(
                deviceId,
                relationship,
                direction,
                otherDeviceId,
            );
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpGet('/:deviceId/:relationship/devices')
    public async listDeviceRelatedDevices(
        @requestParam('deviceId') deviceId: string,
        @requestParam('relationship') relationship: string,
        @queryParam('direction') direction: string,
        @queryParam('template') template: string,
        @queryParam('state') state: string,
        @queryParam('offset') offset: number,
        @queryParam('count') count: number,
        @queryParam('sort') sort: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<DeviceResourceList> {
        logger.info(
            `devices.controller listDeviceRelatedDevices: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}, sort:${JSON.stringify(
                sort,
            )}`,
        );

        let r: DeviceResourceList = { results: [] };

        try {
            if (Array.isArray(direction)) {
                throw new InvalidQueryStringError(
                    'Only one `direction` query param can be provided.',
                );
            }
            if (Array.isArray(template)) {
                throw new InvalidQueryStringError(
                    'Only one `template` query param can be provided.',
                );
            }
            if (Array.isArray(state)) {
                throw new InvalidQueryStringError('Only one `state` query param can be provided.');
            }

            const sortKeys = assembleSortKeys(sort);
            const items = await this.devicesService.listRelatedDevices(
                deviceId,
                relationship,
                direction,
                template,
                state,
                offset,
                count,
                sortKeys,
            );
            if (items === undefined) {
                res.status(404);
            }

            r = this.devicesAssembler.toDeviceResourceList(items, req['version']);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`devices.controller exit: ${JSON.stringify(r)}`);

        return r;
    }

    @httpPost('/:deviceId/components')
    public async createComponent(
        @requestParam('deviceId') deviceId: string,
        @requestBody() component: Device10Resource | Device20Resource,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller createComponent: in: deviceId:${deviceId}, component:${JSON.stringify(
                component,
            )}`,
        );
        try {
            const item = this.devicesAssembler.fromDeviceResource(component);
            await this.devicesService.createComponent(deviceId, item);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpPatch('/:deviceId/components/:componentId')
    public async updateComponent(
        @requestParam('deviceId') deviceId: string,
        @requestParam('componentId') componentId: string,
        @requestBody() component: Device10Resource | Device20Resource,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller updateComponent: in: deviceId:${deviceId}, componentId:${componentId}, component:${JSON.stringify(
                component,
            )}`,
        );
        try {
            const item = this.devicesAssembler.fromDeviceResource(component);
            await this.devicesService.updateComponent(deviceId, componentId, item);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpDelete('/:deviceId/components/:componentId')
    public async deleteComponent(
        @requestParam('deviceId') deviceId: string,
        @requestParam('componentId') componentId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.info(
            `devices.controller deleteComponent: in: deviceId:${deviceId}, componentId:${componentId}`,
        );
        try {
            await this.devicesService.deleteComponent(deviceId, componentId);
        } catch (e) {
            handleError(e, res);
        }
    }
}
