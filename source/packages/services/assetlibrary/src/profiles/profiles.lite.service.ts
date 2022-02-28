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
import { injectable } from 'inversify';
import { NotSupportedError } from '../utils/errors';
import {logger} from '../utils/logger';
import { DeviceProfileItem, GroupProfileItem, ProfileItemList } from './profiles.models';
import { ProfilesService } from './profiles.service';

@injectable()
export class ProfilesServiceLite implements ProfilesService {

    public async get(templateId:string, profileId:string): Promise<DeviceProfileItem|GroupProfileItem> {
        logger.debug(`profiles.full.service get: in: templateId:${templateId}, profileId:${profileId}`);
        throw new NotSupportedError();
    }

    public async create(model:DeviceProfileItem|GroupProfileItem) : Promise<string> {
        logger.debug(`profiles.full.service create: in: model:${JSON.stringify(model)}`);
        throw new NotSupportedError();
    }

    public async update(model: DeviceProfileItem | GroupProfileItem) : Promise<string> {
        logger.debug(`profiles.full.service update: in: model: ${JSON.stringify(model)}`);
        throw new NotSupportedError();
    }

    public async delete(templateId:string, profileId:string) : Promise<void> {
        logger.debug(`profiles.full.service delete: in: templateId:${templateId}, profileId:${profileId}`);
        throw new NotSupportedError();
    }

    public async list(templateId:string): Promise<ProfileItemList> {
        logger.debug(`profiles.full.service list: in: templateId:${templateId}`);
        throw new NotSupportedError();
    }
}
