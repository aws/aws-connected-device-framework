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
import {logger} from '@awssolutions/simple-cdf-logger';
import Ajv from 'ajv';
import { Operation, TypeCategory } from './constants';
import { TemplateDefinitionJson, TypeDefinitionModel, TypeModel } from './types.models';
import { DirectionToRelatedEntityArrayMap, DirectionToStringArrayMap, EntityTypeMap, RelatedEntityArrayMap } from '../data/model';
import { TYPES } from '../di/types';
import { DevicesDaoFull } from '../devices/devices.full.dao';
import { GroupsDaoFull } from '../groups/groups.full.dao';
import fs from 'fs';
import path from 'path';
import util from 'util';
import ow from 'ow';
import * as NodeCache from 'node-cache';
import { TypesDaoFull } from './types.full.dao';
import { SchemaValidationError, TemplateNotFoundError } from '../utils/errors';

@injectable()
export class SchemaValidatorService {

    private _readFileAsync = util.promisify(fs.readFile);

    private _validator = new Ajv({allErrors: true});

    private _typesCache = new NodeCache.default({ stdTTL: Number(process.env.CACHE_TYPES_TTL)});

    constructor(
        @inject(TYPES.TypesDao) private typesDao: TypesDaoFull,
        @inject(TYPES.DevicesDao) private devicesDao: DevicesDaoFull,
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDaoFull) { }

    public async validate(schemaId:string, jsonSchema: TemplateDefinitionJson, document: unknown, op:Operation  ): Promise<SchemaValidationResult> {
        logger.debug(`schemaValidator.full.service validate: in: schemaId:${schemaId}, jsonSchema:${JSON.stringify(jsonSchema)}, document:${JSON.stringify(document)}, op:${op}`);

        // remove any undefined properties from the input document
        const docAsJson = JSON.parse(JSON.stringify(document));
        Object.keys(docAsJson).forEach(k => {
            if (docAsJson[k] === undefined) {
              delete docAsJson[k];
            }
        });
        document = docAsJson;

        // if its an update, validation may be different therefore always compile rather than reuse existing
        this._validator.removeSchema(schemaId);
        let validate: Ajv.ValidateFunction;
        try {
            validate = this._validator.compile(jsonSchema);
        } catch (err) {
            throw new SchemaValidationError(err.message);
        }

        const result = new SchemaValidationResult();
        const valid= await validate(document);
        if (valid) {
            result.isValid = true;
        } else {
            // make the error messages as friendly as possibly, extracting what's useful from the errors
            logger.debug(`schemaValidator.full.service validate: validate.errors: ${JSON.stringify(validate.errors)}`);
            result.isValid = false;
            const maxErrors = 20;
            // truncate to include only 20 errors, to prevent data amplification by sending a large, invalid payload.
            for (let i = 0; i < validate.errors.length && i < maxErrors; ++i) {
                const err = validate.errors[i];
                if (err.keyword === 'required' && err.dataPath === '') {
                    result.errors[(err.params as Ajv.DependenciesParams).missingProperty] =
                        err.message;
                }
                if (err.keyword === 'additionalProperties') {
                    result.errors[`${err.dataPath} ${JSON.stringify(err.params)}`] = err.message;
                } else {
                    result.errors[err.dataPath] = err.message;
                }
            }
            if (validate.errors.length > maxErrors) {
                result.errors['too many errors'] = `results truncated due to greater than maximum ${maxErrors} errors. Check logs for full error list.`
            }

        }

        logger.debug(`schemaValidator.full.service validate: exit: result: ${JSON.stringify(result)}`);

        return result;
    }

    public async validateRelationshipsByType(templateId: string, rels: DirectionToStringArrayMap): Promise<boolean> {
        logger.debug(`schemaValidator.full.service validateRelationships: in: templateId:${templateId}, rels:${JSON.stringify(rels)}`);

        ow(templateId, 'templateId', ow.string.nonEmpty);

        if (rels?.in === undefined && rels?.out === undefined) {
            // nothing to validate
            logger.debug(`schemaValidator.full.service validateRelationshipsByType: exit: true (nothing)`);
            return true;
        }

        // any ids need to be lowercase
        templateId = templateId.toLowerCase();

        // check in datastore
        const isValid = await this.typesDao.validateRelationshipsByType(templateId, rels);

        logger.debug(`schemaValidator.full.service validateRelationships: exit: ${isValid}`);
        return isValid;
    }

    public async validateType(category: TypeCategory, instance: unknown, op: Operation): Promise<SchemaValidationResult> {
        logger.debug(`schemaValidator.full.service validateType: in: category: ${category}, document: ${JSON.stringify(instance)}`);

        ow(category, 'category', ow.string.nonEmpty);
        ow(instance, ow.object.nonEmpty);

        let schema = this._typesCache.get(category) as TemplateDefinitionJson;
        if (schema === undefined) {
            schema = JSON.parse(await this.loadSchema(category));
            this._typesCache.set(category, schema);
        }

        logger.debug(`schemaValidator.full.service validateType: schema:${JSON.stringify(schema)}`);

        return await this.validate(schema['$id'], schema, instance, op);
    }

    public async validateSubType(template: TypeModel, instance: unknown, op: Operation): Promise<SchemaValidationResult> {
        logger.debug(`schemaValidator.full.service validateSubType: in: template: ${JSON.stringify(template)}, instance: ${JSON.stringify(instance)}, op:${op}`);

        ow(template, 'template', ow.object.nonEmpty);
        ow(instance, ow.object.nonEmpty);

        // if we have not preprocessed the subtype schema before, retrieve the category schema then merge it with the sub type
        let subTypeSchema = this._typesCache.get(template.templateId) as TemplateDefinitionJson;
        if (subTypeSchema === undefined) {
            // retrieve the category schema
            let schema = this._typesCache.get(template.category) as TemplateDefinitionJson;
            if (schema === undefined) {
                schema = JSON.parse(await this.loadSchema(template.category));
                this._typesCache.set(template.category, schema);
            }
            if (schema === undefined) {
                throw new TemplateNotFoundError(template.category);
            }
            await this.initializeSubTypeSchema(template, schema);
            this._typesCache.set(template.templateId, schema, 10);
            subTypeSchema = schema as TemplateDefinitionJson;
        }

        // if this is an update rather than a create, we need to relax the required fields
        // on the schema validation (if not provided) as updates occur via a patch
        if (op === Operation.UPDATE) {
            const definedAsCategoryRequired = subTypeSchema.required as string[];
            logger.silly(`schemaValidator.full.service definedAsCategoryRequired:${JSON.stringify(definedAsCategoryRequired)}`);
            logger.silly(`schemaValidator.full.service instance:${JSON.stringify(instance)}`);
            if ((definedAsCategoryRequired?.length??0)>0) {
                const categoryRequired: string[] = [];
                definedAsCategoryRequired.forEach(r => {
                    logger.silly(`schemaValidator.full.service checking:${JSON.stringify(r)}`);
                    if (instance.hasOwnProperty.call(r)) {
                        logger.silly(`schemaValidator.full.service has!`);
                        categoryRequired.push(r);
                    }
                });
                subTypeSchema.required = categoryRequired;
            }

            const definedAsSubTypeRequired = subTypeSchema.definitions.subType.required as string[];
            logger.silly(`schemaValidator.full.service definedAsSubTypeRequired:${JSON.stringify(definedAsSubTypeRequired)}`);
            logger.silly(`schemaValidator.full.service instance:${JSON.stringify(instance)}`);
            if ((definedAsSubTypeRequired?.length??0)>0) {
                const subTypeRequired: string[] = [];
                definedAsSubTypeRequired.forEach(r => {
                    logger.silly(`schemaValidator.full.service checking:${JSON.stringify(r)}`);
                    if (instance.hasOwnProperty.call(r)) {
                        logger.silly(`schemaValidator.full.service has!`);
                        subTypeRequired.push(r);
                    }
                });
                subTypeSchema.definitions.subType.required = subTypeRequired;
            }
        }

        logger.silly(`schemaValidator.full.service validateSubType: schema:${JSON.stringify(subTypeSchema)}`);

        const result = await this.validate(subTypeSchema['$id'], subTypeSchema, instance, op);
        logger.debug(`schemaValidator.full.service validateSubType: exit:${JSON.stringify(result)}`);
        return result;
    }

    public async validateRelationshipsByIds(template: TypeModel, groups: DirectionToRelatedEntityArrayMap, devices: DirectionToRelatedEntityArrayMap): Promise<ValidateRelationshipsByIdsResult> {
        logger.debug(`schemaValidator.full.service validateRelationshipsByIds: in: template:${JSON.stringify(template)}, groups:${JSON.stringify(groups)}, devices:${JSON.stringify(devices)}`);

        ow(template, ow.object.nonEmpty);

        // extrapolate the entity ids from the rels parameter to make our lives easier...
        const extrapolateIds = (rels: RelatedEntityArrayMap, ids:string[]) => {
            if ((Object.keys(rels||{}).length??0)>0) {
                Object.values(rels).forEach(entities=> entities.forEach(entity=> ids.push(entity.id.toLowerCase())));
            }
        };
        const groupPaths:string[]= [];
        extrapolateIds(groups?.in, groupPaths);
        extrapolateIds(groups?.out, groupPaths);
        const deviceIds:string[]= [];
        extrapolateIds(devices?.in, deviceIds);
        extrapolateIds(devices?.out, deviceIds);

        let isValid = true;

        // retrieve the labels of entities to link, along with allowed relations
        const groupLabelsFuture = this.groupsDao.getLabels(groupPaths);
        const deviceLabelsFuture = this.devicesDao.getLabels(deviceIds);
        const [groupLabels, deviceLabels] = await Promise.all([groupLabelsFuture, deviceLabelsFuture]);

        // ensure the provided entity ids are valid
        const validatedGroupPaths = Object.keys(groupLabels||{});
        const invalidGroupPaths = groupPaths.filter(path=> !validatedGroupPaths.includes(path));
        if ( invalidGroupPaths.length > 0) {
            isValid = false;
        }

        const validatedDeviceIds = Object.keys(deviceLabels||{});
        const invalidDeviceIds = deviceIds.filter(id=> !validatedDeviceIds.includes(id));
        if ( invalidDeviceIds.length > 0) {
            isValid = false;
        }

        // verify that the attempted relationships are valid
        const invalidRelations: { [relation: string] : string[] } = {};
        const validateIncomingRelations = (rels:RelatedEntityArrayMap, labels:EntityTypeMap) : void => {
            if (Object.keys(rels||{}).length===0) return;
            for (const [relation,entities] of Object.entries(rels)) {
                for (const entity of entities) {
                    const label = labels[entity.id.toLowerCase()]?.filter(label=> label!=='group' && label!=='device')?.[0];
                    if (label===undefined || !template.schema.relations.incomingIncludes(relation, label)) {
                        if (invalidRelations[relation]===undefined) {
                            invalidRelations[relation] = [];
                        }
                        invalidRelations[relation].push(label);
                        isValid = false;
                    }
                }
            }
        }
        const validateOutgoingRelations = (rels:RelatedEntityArrayMap, labels:EntityTypeMap) : void => {
            if (Object.keys(rels||{}).length===0) return;
            for (const [relation,entities] of Object.entries(rels)) {
                logger.debug(`schemaValidator.full.service validateRelationshipsByIds: ***: relation: ${relation}, entities: ${JSON.stringify(entities)}`);
                for (const entity of entities) {
                    logger.debug(`schemaValidator.full.service validateRelationshipsByIds: ***: entity: ${JSON.stringify(entity)}`);
                    const label = labels[entity.id.toLowerCase()]?.filter(label=> label!=='group' && label!=='device')?.[0];
                    logger.debug(`schemaValidator.full.service validateRelationshipsByIds: ***: label: ${JSON.stringify(label)}`);
                    if (label===undefined || !template.schema.relations.outgoingIncludes(relation, label)) {
                        if (invalidRelations[relation]===undefined) {
                            invalidRelations[relation] = [];
                        }
                        invalidRelations[relation].push(label);
                        isValid = false;
                        logger.debug(`schemaValidator.full.service validateRelationshipsByIds: ***: updated invalidRelations: ${JSON.stringify(invalidRelations)}`);
                    }
                }
            }
        }

        validateIncomingRelations(groups?.in, groupLabels);
        validateOutgoingRelations(groups?.out, groupLabels);
        validateIncomingRelations(devices?.in, deviceLabels);
        validateOutgoingRelations(devices?.out, deviceLabels);

        const response = {
            groupLabels,
            deviceLabels,
            invalidGroupPaths,
            invalidDeviceIds,
            invalidRelations,
            isValid
        };
        logger.debug(`schemaValidator.full.service validateRelationshipsByIds: exit: ${JSON.stringify(response)}`);
        return response;
    }

    public async validateSchema(definition: TypeDefinitionModel, op: Operation): Promise<SchemaValidationResult> {
        // validate the provided schema
        const cacheKey = 'specializedTypeDefinition';
        let schema = this._typesCache.get(cacheKey) as TemplateDefinitionJson;
        if (schema === undefined) {
            schema = JSON.parse(await this.loadSchema(cacheKey));
            this._typesCache.set(cacheKey, schema);
        }

        return await this.validate(schema['$id'], schema, definition, op);
    }

    private async initializeSubTypeSchema(template: TypeModel, schema: TemplateDefinitionJson): Promise<void> {
        logger.debug(`schemaValidator.full.service initializeSubTypeSchema: in: template:${JSON.stringify(template)}, schema:${JSON.stringify(schema)}`);

        ow(template, ow.object.nonEmpty);

        const typeDef = template.schema.definition;
        schema.definitions.subType.properties = typeDef.properties;
        schema.definitions.subType.required = typeDef.required;

        // does the sub-type support components?
        if ((template.schema.definition.componentTypes?.length??0) > 0) {
            // if so, augment the main type schema with the component schemas
            let componentSchema = this._typesCache.get('component') as TemplateDefinitionJson;
            if (componentSchema === undefined) {
                componentSchema = JSON.parse(await this.loadSchema('component'));
                this._typesCache.set('component', componentSchema);
            }
            const componentSchemas: { [key: string]: TemplateDefinitionJson } = {};
            for (const componentModel of template.schema.definition.componentTypes) {
                if (componentSchemas[componentModel.templateId] !== undefined) {
                    continue;
                }
                ow(componentModel, `component model ${componentModel.templateId}`, ow.object.nonEmpty);

                const componentDef = componentModel.schema.definition;
                componentSchema.definitions.subType.properties = componentDef.properties;
                componentSchema.definitions.subType.required = componentDef.required;
                componentSchemas[componentModel.templateId] = componentSchema;
            }
            Object.keys(componentSchemas).forEach(key => {
                schema.definitions.componentTypes.items.anyOf.push(componentSchemas[key]);
            });

        } else {
            delete schema.properties.components;
            delete schema.definitions.componentTypes;
        }

        schema['$id'] = `http://aws.com/cdf/schemas/${template.templateId}.json`;

        logger.debug(`schemaValidator.full.service initializeSubTypeSchema: exit: schema:${JSON.stringify(schema)}`);
    }

    private async loadSchema(templateId: string): Promise<string> {
        logger.debug(`schemaValidator.full.service loadSchema: in: templateId:${templateId}`);

        ow(templateId, 'templateId', ow.string.nonEmpty);

        let json: string;
        try {
            json = await this._readFileAsync(path.join(__dirname, `definitions/${templateId}.schema.json`), { encoding: 'utf8' });
        } catch (err) {
            throw new TemplateNotFoundError(templateId);
        }

        logger.debug(`schemaValidator.full.service loadSchema: exit: ${json}`);
        return json;
    }

    public async deleteFromCache(templateId:string) : Promise<void> {
        await this._typesCache.del(templateId);
    }
}

export class SchemaValidationResult {
    isValid: boolean;
	errors?: { [dataPath: string] : string} = {};
}

export interface ValidateRelationshipsByIdsResult {
    groupLabels : EntityTypeMap;
    deviceLabels : EntityTypeMap;

    invalidGroupPaths : string[];
    invalidDeviceIds : string[];
    invalidRelations: { [relation: string] : string[] };
    isValid : boolean;
}