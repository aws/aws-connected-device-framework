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
import ow from 'ow';
import {logger} from '../../utils/logger.util';
import {TYPES} from '../../di/types';
import {GreengrassSubscriptionItem} from '../../subscriptions/subscriptions.models';
import {GreengrassUtils} from '../../utils/greengrass.util';
import {SubscriptionsService} from '../../subscriptions/subscriptions.service';

@injectable()
export class CreateGroupVersionHandler extends AbstractDeviceAssociationHandler {

    constructor(
        @inject(TYPES.GreengrassUtils) private ggUtils: GreengrassUtils,
        @inject(TYPES.SubscriptionsService) private subscriptionsService: SubscriptionsService) {
        super();
    }

    public async handle(request: DeviceAssociationModel): Promise<DeviceAssociationModel> {
        logger.debug(`createGroupVersion.handler handle: in: request:${JSON.stringify(request)}`);

        ow(request?.taskInfo?.status, ow.string.nonEmpty);

        if (request.taskInfo.status==='Failure') {
            return super.handle(request);
        }

        ow( request?.taskInfo, ow.object.nonEmpty);
        ow( request.ggGroup?.Id, ow.string.nonEmpty);
        ow( request.ggGroupVersion, ow.object.nonEmpty);
        ow( request.ggCoreVersion?.Cores, ow.array);
        ow( request.ggDeviceVersion?.Devices, ow.array);

        let coreInfoChanged = false;
        let deviceInfoChanged = false;
        const subscriptions:GreengrassSubscriptionItem[]= [];

        for (const device of request.taskInfo.devices.filter((d=> d.status==='InProgress'))) {

            ow(device.thingName, ow.string.nonEmpty);
            ow(device.type, ow.string.nonEmpty);

            const thing = request.things[device.thingName];
            ow(thing, ow.object.nonEmpty);

            // if provisioned, and a cert is associated, we can associate it with the group

            const ggDevice : (AWS.Greengrass.Core | AWS.Greengrass.Device) = {
                CertificateArn: request.certificateArns[device.thingName],
                Id: thing.thingId,
                ThingArn: thing.thingArn,
                SyncShadow: device.syncShadow ?? true
            };
            if (device.type==='core') {
                request.ggCoreVersion.Cores.push(ggDevice);
                coreInfoChanged=true;
            } else {
                request.ggDeviceVersion.Devices.push(ggDevice);
                deviceInfoChanged=true;
            }

            // any subscription templates to process?
            const subTemplates = request.template.subscriptions;
            if (subTemplates!==undefined) {
                for(const thingType of Object.keys(subTemplates)) {
                    if (thingType==='__all' || thingType===thing.thingTypeName) {
                        // expand the template and add it as a subscription
                        subscriptions.push(... subTemplates[thingType].map(s=> this.subscriptionsService.expandSubscriptionTemplate(s, thing.thingName, thing.thingTypeName, thing.thingArn)));
                    }
                }
            }

            // any explicit subscriptions to process too?
            if (device.subscriptions?.length>0) {
                subscriptions.push(... device.subscriptions);
            }

            device.status = 'Success';
        }

        // commit any Greengrass device/core updates
        try {
            let updatedCoreVersionArn;
            if (coreInfoChanged) {
                updatedCoreVersionArn = await this.ggUtils.createCoreDefinitionVersion(
                    request.ggGroupVersion.CoreDefinitionVersionArn, request.ggCoreVersion);
            }
            let updatedDevicesVersionArn;
            if (deviceInfoChanged) {
                updatedDevicesVersionArn = await this.ggUtils.createDeviceDefinitionVersion(
                    request.ggGroupVersion.DeviceDefinitionVersionArn, request.ggDeviceVersion);
            }
            let updatedSubscriptionsVersionArn;
            if (subscriptions.length>0) {
                updatedSubscriptionsVersionArn = await this.subscriptionsService.createSubscriptionDefinitionVersion(
                    request.ggGroupVersion.SubscriptionDefinitionVersionArn, subscriptions, []);
            }
            
            let updatedFunctionVersionArn;
            if (coreInfoChanged) {
                updatedFunctionVersionArn = await this.ggUtils.processFunctionEnvVarTokens(
                    {}, request.ggGroupVersion.FunctionDefinitionVersionArn, updatedCoreVersionArn ?? request.ggGroupVersion.CoreDefinitionVersionArn);
            }

            if (coreInfoChanged || deviceInfoChanged || updatedFunctionVersionArn!==undefined || updatedSubscriptionsVersionArn!==undefined) {
                request.updatedGroupVersionId = await this.ggUtils.createGroupVersion(request.ggGroup.Id, request.ggGroupVersion,
                    updatedFunctionVersionArn, updatedCoreVersionArn, updatedDevicesVersionArn, updatedSubscriptionsVersionArn);
            }
        } catch (err) {
            logger.error(`createGroupVersion.handler handle: failed updating greengrass definitions:  err:${err}`);
            request.taskInfo.status = 'Failure';
            request.taskInfo.statusMessage = err.message;
        }

        logger.debug(`createGroupVersion.handler handle: exit:${JSON.stringify(request)}`);
        return super.handle(request);
    }

}
