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
