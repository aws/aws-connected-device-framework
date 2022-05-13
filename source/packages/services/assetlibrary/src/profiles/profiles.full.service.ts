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

import { inject, injectable } from 'inversify';
import clone from 'just-clone';
import ow from 'ow';

import { TYPES } from '../di/types';
import { Event, EventEmitter, Type } from '../events/eventEmitter.service';
import { Operation } from '../types/constants';
import { SchemaValidatorService } from '../types/schemaValidator.full.service';
import { TypeDefinitionStatus } from '../types/types.models';
import { TypesService } from '../types/types.service';
import {
    ProfileNotFoundError, RelationValidationError, SchemaValidationError, TemplateNotFoundError
} from '../utils/errors';
import { logger } from '../utils/logger';
import { ProfilesAssembler } from './profiles.assembler';
import { ProfilesDaoFull } from './profiles.full.dao';
import { DeviceProfileItem, GroupProfileItem, ProfileItemList } from './profiles.models';
import { ProfilesService } from './profiles.service';

@injectable()
export class ProfilesServiceFull implements ProfilesService {

    constructor(
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
        @inject(TYPES.ProfilesAssembler) private profilesAssembler: ProfilesAssembler,
        @inject(TYPES.ProfilesDao) private profilesDao: ProfilesDaoFull,
        @inject(TYPES.SchemaValidatorService) private validator: SchemaValidatorService,
        @inject(TYPES.TypesService) private typesService: TypesService) {}

    public async get(templateId:string, profileId:string): Promise<DeviceProfileItem|GroupProfileItem> {
        logger.debug(`profiles.full.service get: in: templateId:${templateId}, profileId:${profileId}`);

        ow(templateId,'templateId', ow.string.nonEmpty);
        ow(profileId,'profileId', ow.string.nonEmpty);

        // any ids need to be lowercase
        templateId=templateId.toLowerCase();
        profileId=profileId.toLowerCase();

        const result  = await this.profilesDao.get(templateId, profileId);

        let model:DeviceProfileItem|GroupProfileItem;
        if (result!==undefined ) {
            model = this.profilesAssembler.toItem(result);
        }

        logger.debug(`profiles.full.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    private async validate(model:DeviceProfileItem|GroupProfileItem) : Promise<void> {
        logger.debug(`profiles.full.service validate: in: model:${JSON.stringify(model)}`);

        // as a profile is just an instance of a group/device with a few extra fields, we
        // validate it against the template of the group/device.  This involves us removing
        // the profile specific fields before validation, then adding them back in afterwards

        const profile = clone(model);

        delete profile.profileId;
        delete profile.category;

        // note: we always treat the op as an update even when creating so that we can relax the device/group
        // required fields as they will be optional for a profile
        const template = await this.typesService.get(profile.templateId, model.category, TypeDefinitionStatus.published);
        if (template===undefined) {
            throw new TemplateNotFoundError(profile.templateId);
        }
        const validateSubTypeFuture = this.validator.validateSubType(template, profile, Operation.UPDATE);
        const validateRelationshipsFuture = this.validator.validateRelationshipsByIds(template, profile.groups, undefined);
        const [subTypeValidation,validateRelationships] = await Promise.all([validateSubTypeFuture, validateRelationshipsFuture]);

        // schema validation results
        if (!subTypeValidation.isValid) {
            throw new SchemaValidationError(subTypeValidation.errors);
        }

        // validate the id associations
        if (!validateRelationships.isValid)  {
            throw new RelationValidationError(validateRelationships);
        }

        logger.debug('profiles.full.service validate: exit:');
    }

    public async create(model:DeviceProfileItem|GroupProfileItem) : Promise<string> {
        logger.debug(`profiles.full.service create: in: model:${JSON.stringify(model)}`);

        ow(model, ow.object.nonEmpty);
        ow(model.profileId, ow.string.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);
        ow(model.category, ow.string.nonEmpty);

        // remove any non printable characters from the id
        model.profileId = model.profileId.replace(/[^\x20-\x7E]+/g, '');

        // any ids need to be lowercase
        this.setIdsToLowercase(model);

        await this.validate(model);

        const node = this.profilesAssembler.toNode(model);

        // Save to datastore
        const id = await this.profilesDao.create(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.profileId,
            type: Type.profile,
            event: Event.create,
            payload: JSON.stringify(model),
            attributes: {
                category: model.category,
                templateId: model.templateId
            }
        });

        logger.debug(`profiles.full.service create: exit: id: ${id}`);
        return id;

    }

    public async update(model: DeviceProfileItem | GroupProfileItem) : Promise<string> {
        logger.debug(`profiles.full.service update: in: model: ${JSON.stringify(model)}`);

        ow(model, ow.object.nonEmpty);
        ow(model.profileId, ow.string.nonEmpty);
        ow(model.templateId, ow.string.nonEmpty);
        ow(model.category, ow.string.nonEmpty);

        // any ids need to be lowercase
        this.setIdsToLowercase(model);

        await this.validate(model);

        const node = this.profilesAssembler.toNode(model);

        const id = await this.profilesDao.update(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: model.profileId,
            type: Type.profile,
            event: Event.modify,
            payload: JSON.stringify(model),
            attributes: {
                category: model.category,
                templateId: model.templateId
            }
        });

        logger.debug(`profiles.full.service update: exit: id: ${id}`);
        return id;

    }

    public async delete(templateId:string, profileId:string) : Promise<void> {
        logger.debug(`profiles.full.service delete: in: templateId:${templateId}, profileId:${profileId}`);

        ow(templateId,'templateId', ow.string.nonEmpty);
        ow(profileId,'profileId', ow.string.nonEmpty);

        // any ids need to be lowercase
        templateId = templateId.toLowerCase();
        profileId = profileId.toLowerCase();

        const profile = await this.get(templateId, profileId);
        if (profile===undefined) {
            throw new ProfileNotFoundError(profileId);
        }

        await this.profilesDao.delete(templateId, profileId);

        // fire event
        await this.eventEmitter.fire({
            objectId: profileId,
            type: Type.profile,
            event: Event.delete,
            payload: JSON.stringify(profile),
            attributes: {
                templateId
            }
        });

        logger.debug(`profiles.full.service delete: exit:`);

    }

    public async list(templateId:string): Promise<ProfileItemList> {
        logger.debug(`profiles.full.service list: in: templateId:${templateId}`);

        ow(templateId,'templateId', ow.string.nonEmpty);

        const nodes  = await this.profilesDao.list(templateId);
        const model = this.profilesAssembler.toItemList(nodes);

        logger.debug(`profiles.full.service list: exit:${JSON.stringify(model)}`);
        return model;
    }

    private setIdsToLowercase(model:DeviceProfileItem | GroupProfileItem) {
        model.profileId = model.profileId.toLowerCase();
        model.templateId = model.templateId.toLowerCase();
    }
}
