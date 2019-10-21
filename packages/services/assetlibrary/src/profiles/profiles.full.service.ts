/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import {TypesService} from '../types/types.service';
import {Operation} from '../types/constants';
import {EventEmitter, Type, Event} from '../events/eventEmitter.service';
import ow from 'ow';
import { DeviceProfileItem, GroupProfileItem, ProfileItemList } from './profiles.models';
import { ProfilesAssembler } from './profiles.assembler';
import { ProfilesDaoFull } from './profiles.full.dao';
import { ProfilesService } from './profiles.service';

@injectable()
export class ProfilesServiceFull implements ProfilesService {

    constructor(
        @inject(TYPES.ProfilesAssembler) private profilesAssembler: ProfilesAssembler,
        @inject(TYPES.ProfilesDao) private profilesDao: ProfilesDaoFull,
        @inject(TYPES.TypesService) private typesService: TypesService,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter) {}

    public async get(templateId:string, profileId:string): Promise<DeviceProfileItem|GroupProfileItem> {
        logger.debug(`profiles.full.service get: in: templateId:${templateId}, profileId:${profileId}`);

        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

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
        // validate it against the template of the group/device.  This involves is removing
        // the profile specific fields before validation, then adding them back in afterwards
        const profileId = model.profileId;
        const category = model.category;
        delete model.profileId;
        delete model.category;

        // note: we always treat the op as an update even when creating so that we can relax the device/group
        // required fields as they will be optional for a profile
        const validateSubTypeFuture = this.typesService.validateSubType(model.templateId, category, model, Operation.UPDATE);
        const validateRelationshipsFuture = this.typesService.validateRelationshipsByPath(model.templateId, model.groups);
        const results = await Promise.all([validateSubTypeFuture, validateRelationshipsFuture]);

        // schema validation results
        const subTypeValidation = results[0];
        if (!subTypeValidation.isValid) {
            logger.debug(`profiles.full.service validate: subTypeValidation errors:${JSON.stringify(subTypeValidation.errors)}`);
            throw new Error('FAILED_VALIDATION');
        }

        // validate the path associations
        const relationshipsValidation=results[1];
        if (!relationshipsValidation)  {
            logger.debug(`profiles.full.service validate: relationshipsValidation errors:${JSON.stringify(relationshipsValidation)}`);
            throw new Error('INVALID_RELATION');
        }

        // Add the profile specific attributes back to the model
        model.profileId = profileId;
        model.category = category;

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

        ow(templateId, ow.string.nonEmpty);
        ow(profileId, ow.string.nonEmpty);

        // any ids need to be lowercase
        templateId = templateId.toLowerCase();
        profileId = profileId.toLowerCase();

        const profile = await this.get(templateId, profileId);
        if (profile===undefined) {
            throw new Error('NOT_FOUND');
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

        ow(templateId, ow.string.nonEmpty);

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
