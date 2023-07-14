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
import ow from 'ow';

import { logger } from '@awssolutions/simple-cdf-logger';
import { AuthzServiceFull } from '../authz/authz.full.service';
import { ClaimAccess } from '../authz/claims';
import {
    DirectionToRelatedEntityArrayMap,
    OmniRelationDirection,
    RelatedEntityArrayMap,
    RelatedEntityIdentifer,
    RelationDirection,
    SortKeys,
} from '../data/model';
import { Node } from '../data/node';
import { TYPES } from '../di/types';
import { Event, EventEmitter, Type } from '../events/eventEmitter.service';
import { GroupsAssembler } from '../groups/groups.assembler';
import { GroupItemList } from '../groups/groups.models';
import { GroupsService } from '../groups/groups.service';
import { DeviceProfileItem } from '../profiles/profiles.models';
import { ProfilesService } from '../profiles/profiles.service';
import { Operation, TypeCategory } from '../types/constants';
import { SchemaValidatorService } from '../types/schemaValidator.full.service';
import { TypeDefinitionStatus } from '../types/types.models';
import { TypesService } from '../types/types.service';
import {
    DeviceNotFoundError,
    GroupNotFoundError,
    ProfileNotFoundError,
    RelationValidationError,
    SchemaValidationError,
    TemplateNotFoundError,
} from '../utils/errors';
import { owCheckOptionalNumber } from '../utils/inputValidation.util';
import { TypeUtils } from '../utils/typeUtils';
import { DevicesAssembler } from './devices.assembler';
import { DevicesDaoFull } from './devices.full.dao';
import { BulkDevicesResult, DeviceItem, DeviceItemList, DeviceState } from './devices.models';
import { DevicesService } from './devices.service';

@injectable()
export class DevicesServiceFull implements DevicesService {
    private readonly DEFAULT_PAGINATION_COUNT = 500;

    constructor(
        @inject('authorization.enabled') private isAuthzEnabled: boolean,
        @inject('defaults.devices.parent.groupPath') public defaultDeviceParentGroup: string,
        @inject('defaults.devices.parent.relation') public defaultDeviceParentRelation: string,
        @inject('defaults.devices.state') public defaultDeviceState: string,
        @inject(TYPES.AuthzServiceFull) private authServiceFull: AuthzServiceFull,
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.DevicesDao) private devicesDao: DevicesDaoFull,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.GroupsService) private groupsService: GroupsService,
        @inject(TYPES.ProfilesService) private profilesService: ProfilesService,
        @inject(TYPES.SchemaValidatorService) private validator: SchemaValidatorService,
        @inject(TYPES.TypesService) private typesService: TypesService,
        @inject(TYPES.TypeUtils) private typeUtils: TypeUtils,
    ) {}

    public async listRelatedDevices(
        deviceId: string,
        relationship: string,
        direction: OmniRelationDirection,
        template: string,
        state: string,
        offset: number,
        count: number,
        sort: SortKeys,
    ): Promise<DeviceItemList> {
        logger.debug(
            `device.full.service listRelatedDevices: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, state:${state}, offset:${offset}, count:${count}, sort:${JSON.stringify(
                sort,
            )}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        owCheckOptionalNumber(count, 1, 10000, 'count');
        owCheckOptionalNumber(offset, 0, Number.MAX_SAFE_INTEGER, 'offset');

        // default pagination
        if (count === undefined) {
            count = this.DEFAULT_PAGINATION_COUNT;
        }
        if (offset === undefined) {
            offset = 0;
        }

        // defaults
        if (direction === undefined || direction === null) {
            direction = 'both';
        }
        if (template === undefined || template === null) {
            template = TypeCategory.Device;
        }

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        template = template.toLowerCase();
        state = state?.toLowerCase();
        direction = direction.toLowerCase() as OmniRelationDirection;

        await this.authServiceFull.authorizationCheck([deviceId], [], ClaimAccess.R);

        // note: workaround for weird typescript issue. even though offset/count are declared as numbers
        // throughout, they are being interpreted as strings, therefore need to force to int beforehand
        const offsetAsInt = this.typeUtils.parseInt(offset);
        const countAsInt = this.typeUtils.parseInt(count);

        const filteredBy = {};
        if (state) {
            filteredBy['state'] = state;
        }
        const result = await this.devicesDao.listRelated(
            deviceId,
            relationship,
            direction,
            template,
            filteredBy,
            offsetAsInt,
            countAsInt,
            sort,
        );

        const model = this.devicesAssembler.toRelatedDeviceModelsList(
            result,
            offsetAsInt,
            countAsInt,
        );
        logger.debug(
            `devices.full.service listRelatedDevices: exit: model: ${JSON.stringify(model)}`,
        );
        return model;
    }

    public async listRelatedGroups(
        deviceId: string,
        relationship: string,
        direction: OmniRelationDirection,
        template: string,
        offset: number,
        count: number,
        sort: SortKeys,
    ): Promise<GroupItemList> {
        logger.debug(
            `device.full.service listRelatedGroups: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, template:${template}, offset:${offset}, count:${count}, sort:${JSON.stringify(
                sort,
            )}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        owCheckOptionalNumber(count, 1, 10000, 'count');
        owCheckOptionalNumber(offset, 0, Number.MAX_SAFE_INTEGER, 'offset');

        // default pagination
        if (count === undefined) {
            count = this.DEFAULT_PAGINATION_COUNT;
        }
        if (offset === undefined) {
            offset = 0;
        }

        // defaults
        if (direction === undefined || direction === null) {
            direction = 'both';
        }
        if (template === undefined || template === null) {
            template = TypeCategory.Group;
        }

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        template = template.toLowerCase();
        direction = direction.toLowerCase() as OmniRelationDirection;

        // note: workaround for weird typescript issue. even though offset/count are declared as numbers
        // throughout, they are being interpreted as strings, therefore need to force to int beforehand
        const offsetAsInt = this.typeUtils.parseInt(offset);
        const countAsInt = this.typeUtils.parseInt(count);

        await this.authServiceFull.authorizationCheck([deviceId], [], ClaimAccess.R);

        const result = await this.devicesDao.listRelated(
            deviceId,
            relationship,
            direction,
            template,
            {},
            offsetAsInt,
            countAsInt,
            sort,
        );

        const model = this.groupsAssembler.toRelatedGroupItemList(result, offsetAsInt, countAsInt);
        logger.debug(
            `devices.full.service listRelatedGroups: exit: model: ${JSON.stringify(model)}`,
        );
        return model;
    }

    public async get(
        deviceId: string,
        expandComponents?: boolean,
        attributes?: string[],
        includeGroups?: boolean,
    ): Promise<DeviceItem> {
        logger.debug(
            `device.full.service get: in: deviceId:${deviceId}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        if (expandComponents === undefined) {
            expandComponents = false;
        }
        if (includeGroups === undefined) {
            includeGroups = true;
        }

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId], [], ClaimAccess.R);

        const result = await this.devicesDao.get(
            [deviceId],
            expandComponents,
            attributes,
            includeGroups,
        );

        let model: DeviceItem;
        if (result !== undefined && result.length > 0) {
            model = this.devicesAssembler.toDeviceItem(result[0]);
        }

        logger.debug(`device.full.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async getBulk(
        deviceIds: string[],
        expandComponents: boolean,
        attributes: string[],
        includeGroups: boolean,
    ): Promise<DeviceItemList> {
        logger.debug(
            `device.full.service getBulk: in: deviceIds:${deviceIds}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}}`,
        );

        ow(deviceIds, 'deviceIds', ow.array.nonEmpty);

        deviceIds = deviceIds.map((d) => d.toLowerCase());

        const result = await this.devicesDao.get(
            deviceIds,
            expandComponents,
            attributes,
            includeGroups,
        );

        if (result === undefined) {
            return { results: [] };
        }

        const model = this.devicesAssembler.toDeviceItems(result);

        const existingDeviceIds = model.map((deviceItem: DeviceItem) => {
            return deviceItem.deviceId;
        });

        await this.authServiceFull.authorizationCheck(existingDeviceIds, [], ClaimAccess.R);

        logger.debug(`device.full.service get: exit: model: ${JSON.stringify(model)}`);
        return { results: model };
    }

    public async createBulk(
        devices: DeviceItem[],
        applyProfile?: string,
    ): Promise<BulkDevicesResult> {
        logger.debug(
            `device.full.service createBulk: in: devices: ${JSON.stringify(
                devices,
            )}, applyProfile:${applyProfile}`,
        );

        ow(devices, ow.array.nonEmpty);

        let success = 0;
        let failed = 0;
        const errors: { [key: string]: string } = {};
        for (const device of devices) {
            try {
                await this.create(device, applyProfile);
                success++;
            } catch (err) {
                errors[device.deviceId] = err;
                failed++;
            }
        }

        const response = {
            success,
            failed,
            total: success + failed,
            errors,
        };

        logger.debug(
            `device.full.service createBulk: exit: response: ${JSON.stringify(response)}`,
        );
        return response;
    }

    public async ___test___applyProfile(
        model: DeviceItem,
        applyProfile?: string,
    ): Promise<DeviceItem> {
        return this.applyProfile(model, applyProfile);
    }

    private async applyProfile(model: DeviceItem, applyProfile?: string): Promise<DeviceItem> {
        logger.debug(
            `device.full.service applyProfile: in: model:${JSON.stringify(
                model,
            )}, applyProfile:${applyProfile}`,
        );

        // retrieve profile
        const profile = (await this.profilesService.get(
            model.templateId,
            applyProfile,
        )) as DeviceProfileItem;
        if (profile === undefined) {
            throw new ProfileNotFoundError(applyProfile);
        }

        // apply profile to unset attributes
        if (profile.attributes === undefined) {
            profile.attributes = {};
        }
        if (model.attributes === undefined) {
            model.attributes = {};
        }
        if (profile.groups === undefined) {
            profile.groups = {};
        }
        if (model.groups === undefined) {
            model.groups = {};
        }
        const { profileId, ...deviceProfileAttributes } = profile; // eslint-disable-line @typescript-eslint/no-unused-vars
        const mergedModel = Object.assign(new DeviceItem(), deviceProfileAttributes, model);
        const mergedAttributes = { ...profile.attributes, ...model.attributes };
        const mergedGroupsIn = { ...profile.groups.in, ...model.groups.in };
        const mergedGroupsOut = { ...profile.groups.out, ...model.groups.out };
        mergedModel.attributes = mergedAttributes;
        mergedModel.groups = {
            in: mergedGroupsIn,
            out: mergedGroupsOut,
        };

        if (Object.keys(mergedModel.groups.in).length === 0) {
            delete mergedModel.groups.in;
        }
        if (Object.keys(mergedModel.groups.out).length === 0) {
            delete mergedModel.groups.out;
        }
        if (Object.keys(mergedModel.groups).length === 0) {
            delete mergedModel.groups;
        }
        if (Object.keys(mergedModel.attributes).length === 0) {
            delete mergedModel.attributes;
        }

        logger.debug(`device.full.service applyProfile: exit:${JSON.stringify(mergedModel)}`);

        return mergedModel;
    }

    public async create(device: DeviceItem, applyProfile?: string): Promise<string> {
        logger.debug(
            `device.full.service create: in: device: ${JSON.stringify(
                device,
            )}, applyProfile:${applyProfile}`,
        );

        ow(device, ow.object.nonEmpty);
        ow(device.templateId, ow.string.nonEmpty);
        ow(device.deviceId, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile !== undefined) {
            device = await this.applyProfile(device, applyProfile);
        }

        // remove any non printable characters from the id
        device.deviceId = device.deviceId.replace(/[^\x20-\x7E]+/g, '');

        // any ids need to be lowercase
        this.setIdsToLowercase(device);

        // default initial associations if none provided
        if (
            device.groups?.in === undefined &&
            device.groups?.out === undefined &&
            device.devices?.in === undefined &&
            device.devices?.out === undefined &&
            (this.defaultDeviceParentRelation ?? '') !== '' &&
            (this.defaultDeviceParentGroup ?? '') !== ''
        ) {
            device.groups = {
                out: {
                    [this.defaultDeviceParentRelation]: [
                        {
                            id: this.defaultDeviceParentGroup,
                        },
                    ],
                },
            };
        }

        // we can't check authz til here, as we need to understand any related devices and groups first
        await this.authServiceFull.authorizationCheck(
            device.listRelatedDeviceIds(),
            device.listRelatedGroupPaths(),
            ClaimAccess.C,
        );

        // default initial state if none provided
        if (device.state === undefined && this.defaultDeviceState !== undefined) {
            device.state = <DeviceState>this.defaultDeviceState;
        }

        // perform validation of the device...
        const template = await this.typesService.get(
            device.templateId,
            TypeCategory.Device,
            TypeDefinitionStatus.published,
        );
        if (template === undefined) {
            throw new TemplateNotFoundError(device.templateId);
        }
        const validateSubTypeFuture = this.validator.validateSubType(
            template,
            device,
            Operation.CREATE,
        );
        const validateRelationshipsFuture = this.validator.validateRelationshipsByIds(
            template,
            device.groups,
            device.devices,
        );
        const [subTypeValidation, validateRelationships] = await Promise.all([
            validateSubTypeFuture,
            validateRelationshipsFuture,
        ]);

        // schema validation results
        if (!subTypeValidation.isValid) {
            throw new SchemaValidationError(subTypeValidation.errors);
        }

        // validate the id associations
        if (!validateRelationships.isValid) {
            throw new RelationValidationError(validateRelationships);
        }

        // if fgac is enabled, we need to ensure any relations configured as identifying auth in its template are flagged to be saved as so
        if (this.isAuthzEnabled) {
            const incomingAuthRelations = template.schema.relations.incomingAuthRelations();
            const outgoingAuthRelations = template.schema.relations.outgoingAuthRelations();
            this.authServiceFull.updateRelsIdentifyingAuth(
                device.groups?.in,
                validateRelationships.groupLabels,
                incomingAuthRelations,
            );
            this.authServiceFull.updateRelsIdentifyingAuth(
                device.groups?.out,
                validateRelationships.groupLabels,
                outgoingAuthRelations,
            );
            this.authServiceFull.updateRelsIdentifyingAuth(
                device.devices?.in,
                validateRelationships.deviceLabels,
                incomingAuthRelations,
            );
            this.authServiceFull.updateRelsIdentifyingAuth(
                device.devices?.out,
                validateRelationships.deviceLabels,
                outgoingAuthRelations,
            );
        }

        // Assemble devicemodel into node
        device.category = TypeCategory.Device;
        const node = this.devicesAssembler.toNode(device);

        // Assemble the devices components
        const components: Node[] = [];
        if (device.components !== undefined) {
            device.components.forEach((c) => {
                c.category = TypeCategory.Component;
                components.push(this.devicesAssembler.toNode(c));
            });
        }

        // Save to datastore
        const id = await this.devicesDao.create(node, device.groups, device.devices, components);

        // fire event
        await this.eventEmitter.fire({
            objectId: device.deviceId,
            type: Type.device,
            event: Event.create,
            payload: JSON.stringify(device),
        });

        logger.debug(`device.full.service create: exit: id: ${id}`);
        return id;
    }

    private setIdsToLowercase(model: DeviceItem) {
        logger.debug(`device.full.service setIdsToLowercase: in:`);

        model.deviceId = model.deviceId.toLowerCase();
        model.templateId = model.templateId?.toLowerCase();

        const relatedIdToLowercase = (rels: RelatedEntityArrayMap) => {
            /* lowercasting values */
            Object.values(rels).forEach((entities) => {
                entities.forEach((entity) => (entity.id = entity.id.toLowerCase()));
            });
            /* lowercasting keys */
            rels = Object.fromEntries(Object.entries(rels).map(([k, v]) => [k.toLowerCase(), v]));
            return rels;
        };
        if (model.groups?.in) {
            model.groups.in = relatedIdToLowercase(model.groups.in);
        }
        if (model.groups?.out) {
            model.groups.out = relatedIdToLowercase(model.groups.out);
        }
        if (model.devices?.in) {
            model.devices.in = relatedIdToLowercase(model.devices.in);
        }
        if (model.devices?.out) {
            model.devices.out = relatedIdToLowercase(model.devices.out);
        }

        if (model.components) {
            model.components = model.components.map((c) => {
                if (c && c.deviceId) {
                    c.deviceId = c.deviceId.toLowerCase();
                }
                return c;
            });
        }
        logger.debug(`device.full.service setIdsToLowercase: exit:`);
    }

    public async updateBulk(
        devices: DeviceItem[],
        applyProfile?: string,
    ): Promise<BulkDevicesResult> {
        logger.debug(
            `device.full.service updateBulk: in: devices: ${JSON.stringify(
                devices,
            )}, applyProfile:${applyProfile}`,
        );

        ow(devices, ow.array.nonEmpty);

        let success = 0;
        let failed = 0;
        const errors: { [key: string]: string } = {};
        for (const device of devices) {
            try {
                await this.update(device, applyProfile);
                success++;
            } catch (err) {
                errors[device.deviceId] = err;
                failed++;
            }
        }

        const response = {
            success,
            failed,
            total: success + failed,
            errors,
        };

        logger.debug(`device.full.service updateBulk: exit: response: ${response}`);
        return response;
    }

    public async update(device: DeviceItem, applyProfile?: string): Promise<void> {
        logger.debug(
            `device.full.service update: in: model: ${JSON.stringify(
                device,
            )}, applyProfile:${applyProfile}`,
        );

        ow(device, ow.object.nonEmpty);
        ow(device.deviceId, ow.string.nonEmpty);

        // if a profile to apply has been provided, apply it first
        if (applyProfile !== undefined) {
            const existing = await this.get(device.deviceId);
            if (existing === undefined) {
                throw new DeviceNotFoundError(device.deviceId);
            }
            const merged = Object.assign(new DeviceItem(), existing, device);
            device = await this.applyProfile(merged, applyProfile);
        }

        // any ids need to be lowercase
        this.setIdsToLowercase(device);

        // authz check
        const deviceIds = device.listRelatedDeviceIds();
        deviceIds.push(device.deviceId);
        await this.authServiceFull.authorizationCheck(
            deviceIds,
            device.listRelatedGroupPaths(),
            ClaimAccess.U,
        );

        const labels = await this.devicesDao.getLabels([device.deviceId]);
        const templateId = labels[device.deviceId]?.[0];
        if (templateId === undefined) {
            throw new TemplateNotFoundError(templateId);
        }

        // schema validation
        const template = await this.typesService.get(
            templateId,
            TypeCategory.Device,
            TypeDefinitionStatus.published,
        );
        const validate = await this.validator.validateSubType(template, device, Operation.UPDATE);
        if (!validate.isValid) {
            throw new SchemaValidationError(validate.errors);
        }

        // Validate relationships for this device to specified groups in update
        const validateRelationships = await this.validator.validateRelationshipsByIds(
            template,
            device.groups,
            device.devices,
        );
        if (!validateRelationships.isValid) {
            throw new RelationValidationError(validateRelationships);
        }

        // if fgac is enabled, we need to ensure any relations configured as identifying auth in its template are flagged to be saved as so
        if (this.isAuthzEnabled) {
            const incomingAuthRelations = template.schema.relations.incomingAuthRelations();
            const outgoingAuthRelations = template.schema.relations.outgoingAuthRelations();
            this.authServiceFull.updateRelsIdentifyingAuth(
                device.groups?.in,
                validateRelationships.groupLabels,
                incomingAuthRelations,
            );
            this.authServiceFull.updateRelsIdentifyingAuth(
                device.groups?.out,
                validateRelationships.groupLabels,
                outgoingAuthRelations,
            );
            this.authServiceFull.updateRelsIdentifyingAuth(
                device.devices?.in,
                validateRelationships.deviceLabels,
                incomingAuthRelations,
            );
            this.authServiceFull.updateRelsIdentifyingAuth(
                device.devices?.out,
                validateRelationships.deviceLabels,
                outgoingAuthRelations,
            );
        }

        // Assemble devicemodel into node
        device.category = TypeCategory.Device;
        device.templateId = templateId;
        const node = this.devicesAssembler.toNode(device);

        // Save to datastore
        await this.devicesDao.update(node, device.groups, device.devices);

        // fire event
        await this.eventEmitter.fire({
            objectId: device.deviceId,
            type: Type.device,
            event: Event.modify,
            payload: JSON.stringify(device),
        });

        logger.debug(`device.full.service update: exit:`);
    }

    public async delete(deviceId: string): Promise<void> {
        logger.debug(`device.full.service delete: in: deviceId: ${deviceId}`);

        ow(deviceId, 'deviceId', ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId], [], ClaimAccess.D);

        const device = await this.get(deviceId, false, undefined, true);

        // Save to datastore
        await this.devicesDao.delete(deviceId);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.delete,
            payload: JSON.stringify(device),
        });

        logger.debug(`device.full.service delete: exit:`);
    }

    public async attachToGroup(
        deviceId: string,
        relationship: string,
        direction: RelationDirection,
        groupPath: string,
    ): Promise<void> {
        logger.debug(
            `device.full.service attachToGroup: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.oneOf(['in', 'out']));
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        groupPath = groupPath.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId], [groupPath], ClaimAccess.U);

        // fetch the existing device / group
        const deviceFuture = this.get(deviceId, false, [], true);
        const groupFuture = this.groupsService.get(groupPath, false);
        const [device, group] = await Promise.all([deviceFuture, groupFuture]);

        // make sure they exist
        if (device === undefined) {
            throw new DeviceNotFoundError(deviceId);
        }
        if (group === undefined) {
            throw new GroupNotFoundError(groupPath);
        }

        // if the relation already exists, there's no need to continue
        if (device.groups?.[direction]?.[relationship]?.find((e) => e.id === groupPath)) {
            logger.debug(`device.full.service attachToGroup: relation already exits:`);
            return;
        }

        // ensure that the group relation is allowed
        const relatedGroup: DirectionToRelatedEntityArrayMap = {
            [direction]: {
                [relationship]: [
                    {
                        id: groupPath,
                    },
                ],
            },
        };

        const template = await this.typesService.get(
            device.templateId,
            TypeCategory.Device,
            TypeDefinitionStatus.published,
        );
        const validateRelationships = await this.validator.validateRelationshipsByIds(
            template,
            relatedGroup,
            undefined,
        );
        if (!validateRelationships.isValid) {
            throw new RelationValidationError(validateRelationships);
        }

        // if fgac is enabled, we need to ensure any relations configured as identifying auth in its template are flagged to be saved as so
        let isAuthCheck = true;
        if (this.isAuthzEnabled) {
            const authRelations =
                direction === 'in'
                    ? template.schema.relations.incomingAuthRelations()
                    : template.schema.relations.outgoingAuthRelations();
            this.authServiceFull.updateRelsIdentifyingAuth(
                relatedGroup[direction],
                validateRelationships.groupLabels,
                authRelations,
            );
            isAuthCheck = relatedGroup[direction][relationship][0].isAuthCheck ?? false;
        }

        // Save to datastore
        await this.devicesDao.attachToGroup(
            deviceId,
            relationship,
            direction,
            groupPath,
            isAuthCheck,
        );

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                attachedToGroup: groupPath,
                relationship,
            },
        });

        logger.debug(`device.full.service attachToGroup: exit:`);
    }

    public async detachFromGroup(
        deviceId: string,
        relationship: string,
        direction: RelationDirection,
        groupPath: string,
    ): Promise<void> {
        logger.debug(
            `device.full.service detachFromGroup: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, groupPath:${groupPath}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.oneOf(['in', 'out']));
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        groupPath = groupPath.toLowerCase();

        await this.authServiceFull.authorizationCheck([deviceId], [groupPath], ClaimAccess.U);

        // Save to datastore
        await this.devicesDao.detachFromGroups(deviceId, [
            { relationship, direction, targetId: groupPath },
        ]);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                detachedFromGroup: groupPath,
                relationship,
            },
        });

        logger.debug(`device.full.service detachFromGroup: exit:`);
    }

    public async detachFromGroups(
        deviceId: string,
        relationship?: string,
        direction?: RelationDirection,
    ): Promise<void> {
        logger.debug(
            `device.full.service detachFromGroups: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        if (direction) {
            ow(direction, 'direction', ow.string.oneOf(['in', 'out']));
        }

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship?.toLowerCase();

        // ensure user has access to the device
        await this.authServiceFull.authorizationCheck([deviceId], undefined, ClaimAccess.U);

        // get a list of all the attached groups (permissions check is carried out as part of `listRelatedGroups` call)
        let offset = 0;
        const count = 20;
        let g = await this.listRelatedGroups(
            deviceId,
            relationship,
            direction,
            undefined,
            offset,
            count,
            undefined,
        );
        const relations: RelatedEntityIdentifer[] = [];
        while ((g?.results?.length ?? 0) > 0) {
            relations.push(
                ...g.results.map((r) => ({
                    relationship: r.relation,
                    direction: r.direction,
                    targetId: r.groupPath,
                })),
            );

            offset = offset + count;
            g = await this.listRelatedGroups(
                deviceId,
                relationship,
                direction,
                undefined,
                offset,
                count,
                undefined,
            );
        }

        // remove the associations
        if (relations.length > 0) {
            await this.devicesDao.detachFromGroups(deviceId, relations);
        }

        // fire change events
        relations.forEach(async (r) => {
            await this.eventEmitter.fire({
                objectId: deviceId,
                type: Type.device,
                event: Event.modify,
                attributes: {
                    deviceId,
                    detachedFromGroup: r.targetId,
                    relationship,
                },
            });
        });

        logger.debug(`device.full.service detachFromGroups: exit:`);
    }

    public async attachToDevice(
        deviceId: string,
        relationship: string,
        direction: RelationDirection,
        otherDeviceId: string,
    ): Promise<void> {
        logger.debug(
            `device.full.service attachToDevice: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.oneOf(['in', 'out']));
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        otherDeviceId = otherDeviceId.toLowerCase();

        await this.authServiceFull.authorizationCheck(
            [deviceId, otherDeviceId],
            [],
            ClaimAccess.U,
        );

        // fetch the existing device / group
        const deviceFuture = this.get(deviceId, false, [], false);
        const otherDeviceFuture = this.get(otherDeviceId, false, [], false);
        const [device, otherDevice] = await Promise.all([deviceFuture, otherDeviceFuture]);

        // make sure they exist
        if (device === undefined) {
            throw new DeviceNotFoundError(deviceId);
        }
        if (otherDevice === undefined) {
            throw new DeviceNotFoundError(otherDeviceId);
        }

        // if the relation already exists, there's no need to continue
        if (device.devices?.[direction]?.[relationship]?.find((e) => e.id === otherDeviceId)) {
            logger.debug(`device.full.service attachToDevice: relation already exits:`);
            return;
        }

        // ensure that the relation is allowed
        const relatedDevice: DirectionToRelatedEntityArrayMap = {
            [direction]: {
                [relationship]: [
                    {
                        id: otherDeviceId,
                    },
                ],
            },
        };
        const template = await this.typesService.get(
            device.templateId,
            TypeCategory.Device,
            TypeDefinitionStatus.published,
        );
        if (template === undefined) {
            throw new TemplateNotFoundError(device.templateId);
        }
        const validateRelationships = await this.validator.validateRelationshipsByIds(
            template,
            undefined,
            relatedDevice,
        );
        if (!validateRelationships.isValid) {
            throw new RelationValidationError(validateRelationships);
        }

        // if fgac is enabled, we need to ensure any relations configured as identifying auth in its template are flagged to be saved as so
        let isAuthCheck = true;
        if (this.isAuthzEnabled) {
            const authRelations =
                direction === 'in'
                    ? template.schema.relations.incomingAuthRelations()
                    : template.schema.relations.outgoingAuthRelations();
            this.authServiceFull.updateRelsIdentifyingAuth(
                relatedDevice[direction],
                validateRelationships.deviceLabels,
                authRelations,
            );
            isAuthCheck = relatedDevice[direction][relationship][0].isAuthCheck ?? false;
        }

        // Save to datastore
        await this.devicesDao.attachToDevice(
            deviceId,
            relationship,
            direction,
            otherDeviceId,
            isAuthCheck,
        );

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                attachedToDevice: otherDeviceId,
                relationship,
            },
        });

        logger.debug(`device.full.service attachToDevice: exit:`);
    }

    public async detachFromDevice(
        deviceId: string,
        relationship: string,
        direction: RelationDirection,
        otherDeviceId: string,
    ): Promise<void> {
        logger.debug(
            `device.full.service detachFromDevice: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}, otherDeviceId:${otherDeviceId}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(direction, 'direction', ow.string.oneOf(['in', 'out']));
        ow(otherDeviceId, 'otherDeviceId', ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship.toLowerCase();
        otherDeviceId = otherDeviceId.toLowerCase();

        await this.authServiceFull.authorizationCheck(
            [deviceId, otherDeviceId],
            [],
            ClaimAccess.U,
        );

        // Save to datastore
        await this.devicesDao.detachFromDevices(deviceId, [
            { relationship, direction, targetId: deviceId },
        ]);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            attributes: {
                deviceId,
                detachedFromDevice: otherDeviceId,
                relationship,
            },
        });

        logger.debug(`device.full.service detachFromDevice: exit:`);
    }

    public async detachFromDevices(
        deviceId: string,
        relationship?: string,
        direction?: RelationDirection,
    ): Promise<void> {
        logger.debug(
            `device.full.service detachFromDevices: in: deviceId:${deviceId}, relationship:${relationship}, direction:${direction}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        if (direction) {
            ow(direction, 'direction', ow.string.oneOf(['in', 'out']));
        }

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        relationship = relationship?.toLowerCase();

        // ensure user has access to the device
        await this.authServiceFull.authorizationCheck([deviceId], undefined, ClaimAccess.U);

        // get a list of all the attached devices (permissions check is carried out as part of `listRelatedGroups` call)
        let offset = 0;
        const count = 20;
        let d = await this.listRelatedDevices(
            deviceId,
            relationship,
            direction,
            undefined,
            undefined,
            offset,
            count,
            undefined,
        );
        while ((d?.results?.length ?? 0) > 0) {
            const relations: RelatedEntityIdentifer[] = [];
            relations.push(
                ...d.results.map((r) => ({
                    relationship: r.relation,
                    direction: r.direction,
                    targetId: r.deviceId,
                })),
            );

            // remove the associations
            await this.devicesDao.detachFromDevices(deviceId, relations);

            // fire change events
            relations.forEach(async (r) => {
                await this.eventEmitter.fire({
                    objectId: deviceId,
                    type: Type.device,
                    event: Event.modify,
                    attributes: {
                        deviceId,
                        detachedFromDevice: r.targetId,
                        relationship,
                    },
                });
            });

            offset = offset + count;
            d = await this.listRelatedDevices(
                deviceId,
                relationship,
                direction,
                undefined,
                undefined,
                offset,
                count,
                undefined,
            );
        }

        logger.debug(`device.full.service detachFromDevices: exit:`);
    }

    public async updateComponent(
        deviceId: string,
        componentId: string,
        component: DeviceItem,
    ): Promise<void> {
        logger.debug(
            `device.full.service updateComponent: in: deviceId:${deviceId}, componentId:${componentId}, model:${JSON.stringify(
                component,
            )}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(componentId, 'componentId', ow.string.nonEmpty);
        ow(component, ow.object.hasKeys('deviceId', 'category', 'templateId'));

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        componentId = componentId.toLowerCase();
        this.setIdsToLowercase(component);

        await this.authServiceFull.authorizationCheck([componentId], [], ClaimAccess.U);

        // Assemble devicemodel into node
        component.category = TypeCategory.Component;
        const node = this.devicesAssembler.toNode(component);
        node.attributes['deviceId'] = `${deviceId}___${componentId}`;

        // Save to datastore
        this.devicesDao.update(node);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.modify,
            payload: JSON.stringify(component),
            attributes: {
                deviceId,
                componentId,
            },
        });

        logger.debug(`device.full.service updateComponent: exit:`);
    }

    public async deleteComponent(deviceId: string, componentId: string): Promise<void> {
        logger.debug(
            `device.full.service deleteComponent: in: deviceId:${deviceId}, componentId:${componentId}`,
        );

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(componentId, 'componentId', ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId = deviceId.toLowerCase();
        componentId = componentId.toLowerCase();

        await this.authServiceFull.authorizationCheck([componentId], [], ClaimAccess.D);

        // Assemble devicemodel into node
        const dbId = `${deviceId}___${componentId}`;

        // Save to datastore
        await this.devicesDao.delete(dbId);

        // fire event
        await this.eventEmitter.fire({
            objectId: deviceId,
            type: Type.device,
            event: Event.delete,
            attributes: {
                deviceId,
                componentId,
            },
        });

        logger.debug(`device.full.service deleteComponent: exit:`);
    }

    public async createComponent(parentDeviceId: string, component: DeviceItem): Promise<string> {
        logger.debug(
            `device.full.service createComponent: in: parentDeviceId:${parentDeviceId}, model:${JSON.stringify(
                component,
            )}`,
        );

        ow(parentDeviceId, ow.string.nonEmpty);
        ow(component, ow.object.nonEmpty);
        ow(component.deviceId, ow.string.nonEmpty);
        ow(component.templateId, ow.string.nonEmpty);

        // any ids need to be lowercase
        parentDeviceId = parentDeviceId.toLowerCase();
        this.setIdsToLowercase(component);

        await this.authServiceFull.authorizationCheck([parentDeviceId], [], ClaimAccess.C);

        // ensure the parent device exists
        const parentDevice = await this.get(parentDeviceId);
        if (parentDevice === undefined) {
            throw new DeviceNotFoundError(parentDeviceId);
        }

        // perform validation of the device...
        const parentTemplate = await this.typesService.get(
            parentDevice.templateId,
            TypeCategory.Device,
            TypeDefinitionStatus.published,
        );
        if (parentTemplate === undefined) {
            throw new TemplateNotFoundError(parentDevice.templateId);
        }
        const componentTemplate = parentTemplate.schema.definition.componentTypes?.find(
            (c) => (c.templateId = component.templateId),
        );
        if (componentTemplate === undefined) {
            throw new TemplateNotFoundError(component.templateId);
        }
        const validateSubTypeFuture = this.validator.validateSubType(
            componentTemplate,
            component,
            Operation.CREATE,
        );
        const validateRelationshipsFuture = this.validator.validateRelationshipsByIds(
            componentTemplate,
            component.groups,
            undefined,
        );
        const [subTypeValidation, validateRelationships] = await Promise.all([
            validateSubTypeFuture,
            validateRelationshipsFuture,
        ]);

        // schema validation results
        if (!subTypeValidation.isValid) {
            throw new SchemaValidationError(subTypeValidation.errors);
        }

        // validate the path associations
        if (!validateRelationships.isValid) {
            throw new RelationValidationError(validateRelationships);
        }

        // Assemble devicemodel into node
        component.category = TypeCategory.Component;
        const node = this.devicesAssembler.toNode(component);

        // Save to datastore
        const id = await this.devicesDao.createComponent(parentDeviceId, node);

        // fire event
        await this.eventEmitter.fire({
            objectId: parentDeviceId,
            type: Type.device,
            event: Event.create,
            payload: JSON.stringify(component),
            attributes: {
                deviceId: parentDeviceId,
                componentId: id,
            },
        });

        logger.debug(`device.full.service createComponent: exit: id: ${id}`);
        return id;
    }
}
