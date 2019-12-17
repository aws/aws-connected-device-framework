/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { TypesDaoFull} from './types.full.dao';
import { TypeModel, TypeVersionModel, TypeDefinitionModel, TypeDefinitionStatus} from './types.models';
import { SchemaValidatorService, SchemaValidationResult } from '../utils/schemaValidator.service';
import {TypeCategory, Operation} from './constants';
import {EventEmitter, Type, Event} from '../events/eventEmitter.service';
import * as NodeCache from 'node-cache';
import ow from 'ow';
import { TypesService } from './types.service';
import config from 'config';
import { DirectionStringToArrayMap } from '../data/model';

@injectable()
export class TypesServiceFull implements TypesService {

    private _readFileAsync = util.promisify(fs.readFile);

    private _typesCache = new NodeCache.default({stdTTL:config.get('cache.types.ttl')});

    constructor( @inject(TYPES.TypesDao) private typesDao: TypesDaoFull,
        @inject(TYPES.SchemaValidatorService) private validator: SchemaValidatorService,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter) {}

    private async loadSchema(templateId: string): Promise<string> {
        logger.debug(`types.full.service loadSchema: in: templateId:${templateId}`);

        ow(templateId, ow.string.nonEmpty);

        let json: string;
        try {
            json = await this._readFileAsync(path.join(__dirname, `definitions/${templateId}.schema.json`), {encoding: 'utf8'});
        } catch (err) {
            throw new Error('INVALID_TYPE');
        }

        logger.debug(`types.full.service loadSchema: exit: ${json}`);
        return json;
    }

    public async validateSubType(templateId:string, category:TypeCategory, document:object, op:Operation): Promise<SchemaValidationResult> {
        logger.debug(`types.full.service validateSubType: in: templateId: ${templateId}, category: ${category}, document: ${JSON.stringify(document)}, op:${op}`);

        ow(templateId, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);
        ow(document, ow.object.nonEmpty);

        // any ids need to be lowercase
        templateId=templateId.toLowerCase();

        // if we have not preprocessed the subtype schema before, retrieve the category schema then merge it with the sub type
        let subTypeSchema = this._typesCache.get(templateId) as any;
        if (subTypeSchema===undefined) {
            // retrieve the category schema
            let schema = this._typesCache.get(category);
            if (schema===undefined) {
                schema = JSON.parse(await this.loadSchema(category));
                this._typesCache.set(category, schema);
            }
            if (schema===undefined) {
                throw new Error('TEMPLATE_NOT_FOUND');
            }
            await this.initializeSubTypeSchema(templateId, category, schema);
            this._typesCache.set(templateId, schema, 10);
            subTypeSchema = schema;
        }

        // if this is an update rather than a create, we need to relax the required fields
        // on the schema validation (if not provided) as updates occur via a patch
        if (op===Operation.UPDATE) {
            const definedAsCategoryRequired = subTypeSchema.required as string[];
            if (definedAsCategoryRequired!==undefined) {
                const categoryRequired:string[] = [];
                definedAsCategoryRequired.forEach(r => {
                    if (document.hasOwnProperty(r)) {
                        categoryRequired.push(r);
                    }
                });
                subTypeSchema.required = categoryRequired;
            }
            const definedAsSubTypeRequired = subTypeSchema.definitions.subType.required as string[];
            if (definedAsSubTypeRequired!==undefined) {
                const subTypeRequired:string[] = [];
                definedAsSubTypeRequired.forEach(r => {
                    if (document.hasOwnProperty(r)) {
                        subTypeRequired.push(r);
                    }
                });
                subTypeSchema.definitions.subType.required = subTypeRequired;
            }
        }

        logger.debug(`types.full.service validateSubType: schema:${JSON.stringify(subTypeSchema)}`);

        return await this.validator.validate(subTypeSchema['$id'], subTypeSchema, document, op);
    }

    private async initializeSubTypeSchema(templateId:string, category:TypeCategory, schema:any) {
        logger.debug(`types.full.service initializeSubTypeSchema: in: category:${category}, templateId:${templateId}, schema:${JSON.stringify(schema)}`);

        const superTypeCategory = (category===TypeCategory.Component) ? TypeCategory.Device : category;
        const typeModel = await this.get(templateId, superTypeCategory, TypeDefinitionStatus.published);
        if (typeModel===undefined) {
            throw new Error ('TEMPLATE_NOT_FOUND');
        }

        const typeDef =  typeModel.schema.definition;
        schema.definitions.subType.properties = typeDef.properties;
        schema.definitions.subType.required = typeDef.required;

        // does the sub-type support components?
        if (category===TypeCategory.Device) {
            if (typeModel.schema.definition.components!==undefined && typeModel.schema.definition.components.length>0) {
                // if so, augment the main type schema with the component schemas
                let componentSchema = this._typesCache.get('component') as any;
                if (componentSchema===undefined) {
                    componentSchema = JSON.parse(await this.loadSchema('component'));
                    this._typesCache.set('component', componentSchema);
                }
                const componentSchemas:{[key:string]: any} = {};
                for(const componentTemplateId of typeModel.schema.definition.components) {
                    if (componentSchemas[componentTemplateId]!==undefined) {
                        continue;
                    }
                    const componentModel = await this.get(componentTemplateId, TypeCategory.Device, TypeDefinitionStatus.published);
                    const componentDef = componentModel.schema.definition;
                    componentSchema.definitions.subType.properties = componentDef.properties;
                    componentSchema.definitions.subType.required = componentDef.required;
                    componentSchemas[componentTemplateId]=componentSchema;
                }
                Object.keys(componentSchemas).forEach(key=> {
                    schema.definitions.componentTypes.items.anyOf.push(componentSchemas[key]);
                });

            } else {
                delete schema.properties.components;
                delete schema.definitions.componentTypes;
            }
        }

        schema['$id'] = `http://aws.com/cdf/schemas/${templateId}.json`;

        logger.debug(`types.full.service initializeSubTypeSchema: exit: schema:${JSON.stringify(schema)}`);
    }

    public async validateType(category:TypeCategory, document:object, op:Operation): Promise<SchemaValidationResult> {
        logger.debug(`types.full.service validateType: in: category: ${category}, document: ${JSON.stringify(document)}`);

        ow(category, ow.string.nonEmpty);
        ow(document, ow.object.nonEmpty);

        let schema = this._typesCache.get(category) as any;
        if (schema===undefined) {
            schema = JSON.parse(await this.loadSchema(category));
            this._typesCache.set(category, schema);
        }

        logger.debug(`types.full.service validateType: schema:${JSON.stringify(schema)}`);

        return await this.validator.validate(schema['$id'], schema, document, op);
    }

    public async get(templateId: string, category: TypeCategory, status: TypeDefinitionStatus): Promise<TypeModel> {
        logger.debug(`types.full.service get: in: templateId: ${templateId}, category: ${category}, status: ${status}`);

        ow(templateId, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);

        if (status===undefined) {
            status=TypeDefinitionStatus.published;
        }

        // any ids need to be lowercase
        templateId=templateId.toLowerCase();

        const result  = await this.typesDao.get(templateId, category, status);
        if (result!==undefined) {
            result.schema.definition.relations = result.schema.relations;
        }

        logger.debug(`types.full.service get: exit: ${JSON.stringify(result)}`);
        return result;
    }

    public async list(category:TypeCategory, status:TypeDefinitionStatus, offset?:number, count?:number): Promise<TypeModel[]> {
        logger.debug(`types.full.service list: in: category:${category}, status:${status}, offset:${offset}, count:${count}`);

        ow(category, ow.string.nonEmpty);

        if (status===undefined) {
            status=TypeDefinitionStatus.published;
        }

        const results  = await this.typesDao.list(category, status, offset, count);
        if (results!==undefined && results.length>=0) {
            for(const r of results) {
                r.schema.definition.relations = r.schema.relations;
            }
        }
        return results;
    }

    private async validateRelations(definition:TypeDefinitionModel): Promise<boolean> {
        logger.debug(`types.full.service validateRelations: in: definition:${JSON.stringify(definition)}`);

        let linkedTypesValid = true;

        // validate that any types provided as part of the in/out relations exist
        if (definition.relations!==undefined) {
            let linkedTypes:string[]=[];
            if (definition.relations.out!==undefined) {
                Object.keys(definition.relations.out).forEach(k=> definition.relations.out[k].forEach(v=> linkedTypes.push(v)));
            }
            if (definition.relations.in!==undefined) {
                Object.keys(definition.relations.in).forEach(k=> definition.relations.in[k].forEach(v=> linkedTypes.push(v)));
            }
            linkedTypes = Array.from(new Set(linkedTypes));

            linkedTypesValid = await this.typesDao.validateLinkedTypesExist(linkedTypes);
        }
        logger.debug(`types.full.service create: exit: linkedTypesValid:${linkedTypesValid}`);
        return linkedTypesValid;
    }

    public async create(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult> {
        logger.debug(`types.full.service create: in: templateId:${templateId}, category:${category}, definition:${JSON.stringify(definition)}`);

        ow(templateId, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);

        let r:SchemaValidationResult;

        // any ids need to be lowercase
        templateId=templateId.toLowerCase();

        // remove any non printable characters from the id
        templateId = templateId.replace(/[^\x20-\x7E]+/g, '');

        if (!this.isValidCategory(category)) {
            throw new Error('Invalid category');
        }

        // validate the schema
        const validationResult = await this.validateSchema(definition, Operation.CREATE);
        if (!validationResult.isValid) {
            logger.debug(`types.full.service create: exit: validationResult:${JSON.stringify(definition)}`);
            return validationResult;
        }

        // validate that any types provided as part of the in/out relations exist
        if (!await this.validateRelations(definition)) {
            r= {isValid:false, errors:{relations:'Invalid relation types'}};
            logger.debug(`types.full.service create: exit: ${JSON.stringify(r)}`);
            return r;
        }

        // todo: move to an assembler function
        const model = new TypeModel();
        model.templateId = templateId;
        model.category = category;
        const schema = new TypeVersionModel();
        schema.status = TypeDefinitionStatus.draft;
        schema.version = 1;
        schema.definition = definition;
        schema.relations = definition.relations;
        delete definition.relations;
        model.schema = schema;

        // save to datastore
        await this.typesDao.create(model);

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: (category===TypeCategory.Group) ? Type.groupTemplate : Type.deviceTemplate,
            event: Event.create,
            payload: JSON.stringify(model)
        });

        r= {isValid:true};
        logger.debug(`types.full.service create: exit:${JSON.stringify(r)}`);
        return r;

    }

    public async delete(templateId:string, category:TypeCategory): Promise<void> {
        logger.debug(`types.full.service delete: in: templateId:${templateId}, category:${category}`);

        ow(templateId, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);

        // any ids need to be lowercase
        templateId=templateId.toLowerCase();

        if (!this.isValidCategory(category)) {
            throw new Error('Invalid category');
        }

        //  ensure no devices exist of this template
        const inUse = await this.typesDao.countInUse(templateId);
        if (inUse>0) {
            throw new Error ('TEMPLATE_IN_USE');
        }

        const model = await this.get(templateId, category, TypeDefinitionStatus.published);
        await this.typesDao.delete(templateId);

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: (category===TypeCategory.Group) ? Type.groupTemplate : Type.deviceTemplate,
            event: Event.delete,
            payload: JSON.stringify(model)
        });

        logger.debug('types.full.service delete: exit:');
    }

    public async update(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult> {
        logger.debug(`types.full.service update: in: templateId:${templateId}, category:${category}, definition:${JSON.stringify(definition)}`);

        ow(templateId, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);

        // any ids need to be lowercase
        templateId=templateId.toLowerCase();

        if (!this.isValidCategory(category)) {
            throw new Error('Invalid category');
        }

        const validationResult = await this.validateSchema(definition, Operation.UPDATE);
        if (!validationResult.isValid) {
            logger.debug(`types.full.service update: exit: validationResult:${JSON.stringify(definition)}`);
            return validationResult;
        }

        // validate that any types provided as part of the in/out relations exist
        if (!this.validateRelations(definition)) {
            logger.debug('types.full.service create: exit: linkedTypesValid:false');
            return {isValid:false, errors:{}};
        }

        // todo: move to an assembler function
        const model = new TypeModel();
        model.templateId = templateId;
        model.category = category;
        const schema = new TypeVersionModel();
        schema.status = TypeDefinitionStatus.draft;
        schema.definition = definition;
        schema.relations = definition.relations;
        delete definition.relations;
        model.schema = schema;

        // do we have a draft version already?
        const draft = await this.get(model.templateId, model.category, TypeDefinitionStatus.draft
            );

        // if we do, lets go ahead and update it
        if (draft!==undefined) {
            await this.typesDao.updateDraft(draft, model);
        } else {
            // but if we dont, lets go ahead and create one
            const published = await this.get(model.templateId, model.category, TypeDefinitionStatus.published);

            // if we don't have a published one either, then the type does not exist, we can't proceed
            if (published===undefined) {
                throw new Error(`Type ${model.templateId} ${model.category} does not exist`);
            }

            model.schema.version=published.schema.version+1;
            await this.typesDao.createDraft(model);
        }

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: (category===TypeCategory.Group) ? Type.groupTemplate : Type.deviceTemplate,
            event: Event.modify,
            payload: JSON.stringify(model),
            attributes: {
                status: 'draft'
            }
        });

        const r:SchemaValidationResult= {isValid:true};
        logger.debug(`types.full.service update: exit:${JSON.stringify(r)}`);
        return r;

    }

    public async publish(templateId:string, category:TypeCategory): Promise<void> {
        logger.debug(`types.full.service publish: in: templateId:${templateId}, category:${category}`);

        ow(templateId, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);

        // any ids need to be lowercase
        templateId=templateId.toLowerCase();

        if (!this.isValidCategory(category)) {
            throw new Error('Invalid category');
        }

        // save to datastore
        await this.typesDao.publish(templateId, category);

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: (category===TypeCategory.Group) ? Type.groupTemplate : Type.deviceTemplate,
            event: Event.modify,
            attributes: {
                status: 'published'
            }
        });
        logger.debug(`types.full.service publish: exit:`);
    }

    public async validateRelationshipsByType(templateId:string, rels:DirectionStringToArrayMap): Promise<boolean> {
        logger.debug(`types.full.service validateRelationships: in: templateId:${templateId}, rels:${JSON.stringify(rels)}`);

        ow(templateId, ow.string.nonEmpty);

        if (rels===undefined || (rels.in===undefined && rels.out===undefined)) {
            // nothing to validate
            logger.debug(`types.full.service validateRelationshipsByType: exit: true (nothing)`);
            return true;
        }

        // any ids need to be lowercase
        templateId=templateId.toLowerCase();

        // check in datastore
        const isValid = await this.typesDao.validateRelationshipsByType(templateId, rels);

        logger.debug(`types.full.service validateRelationships: exit: ${isValid}`);
        return isValid;
    }

    public async validateRelationshipsByPath(templateId:string, rels:DirectionStringToArrayMap): Promise<boolean> {
        // example:  in: templateId:edge, in:{}, out:{"manufactured_by":["/suppliers/bosch"]
        logger.debug(`types.full.service validateRelationshipsByPath: in: templateId:${templateId}, rels:${JSON.stringify(rels)}`);

        ow(templateId, ow.string.nonEmpty);

        if (rels===undefined || (rels.in===undefined && rels.out===undefined)) {
            // nothing to validate
            logger.debug(`types.full.service validateRelationshipsByPath: exit: true (nothing)`);
            return true;
        }

        // any ids need to be lowercase
        templateId=templateId.toLowerCase();

        // retrieve the associated group types and allowed relations
        const groupInfo = await this.typesDao.validateRelationshipsByPath(templateId, rels);

        // ensure the provided group paths are valid
        if (groupInfo.invalidGroups!==undefined && groupInfo.invalidGroups.length>0) {
            logger.debug(`types.full.service validateRelationshipsByPath: exit: false (invalid group paths: ${groupInfo.invalidGroups})`);
            return false;
        }

        // ensure the provided relations are valid
        for (const in_out of Object.keys(rels)) {
            for (const rel_name of Object.keys(rels[in_out])) {
                // is the relation type allowed?
                const allowed_rel = groupInfo.rels.filter(r=> r.name===rel_name.toLowerCase());
                if (allowed_rel===undefined || allowed_rel===null || allowed_rel.length===0) {
                    logger.debug(`types.full.service validateRelationshipsByPath: exit: false (invalid relation: ${rel_name})`);
                    return false;
                }

                for (const rel_path of rels[in_out][rel_name]) {
                    // is the type of target groups allowed for this relation?
                    let group;
                    let valid=false;
                    if (in_out==='in') {
                        group = groupInfo.groupTypes_in.filter(gt=> gt.path===rel_path.toLowerCase())[0];
                        valid = group.template===allowed_rel[0].outType;
                    } else {
                        group = groupInfo.groupTypes_out.filter(gt=> gt.path===rel_path.toLowerCase())[0];
                        valid = group.template===allowed_rel[0].inType;
                    }
                    if (!valid) {
                        logger.debug(`types.full.service validateRelationshipsByPath: exit: false (invalid group ${rel_path} for relation: ${rel_name})`);
                        return false;
                    }
                }
            }
        }

        logger.debug('types.full.service validateRelationshipsByPath: exit: true');
        return true;
    }

    private isValidCategory(category: string): boolean {
        return (category===TypeCategory.Device || category===TypeCategory.Group);
    }

    private async validateSchema(definition: object, op:Operation): Promise<SchemaValidationResult> {
        // validate the provided schema
        const cacheKey = 'specializedTypeDefinition';
        let schema = this._typesCache.get(cacheKey) as any;
        if (schema===undefined) {
            schema = JSON.parse(await this.loadSchema(cacheKey));
            this._typesCache.set(cacheKey, schema);
        }

        return await this.validator.validate(schema['$id'], schema, definition, op);
    }

}
