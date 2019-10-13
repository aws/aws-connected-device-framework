/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import { TypeModel, TypeDefinitionModel, TypeVersionModel, TypeDefinitionStatus} from './types.models';
import { SchemaValidationResult } from '../utils/schemaValidator.service';
import {TypeCategory, Operation} from './constants';
import ow from 'ow';
import { TypesService } from './types.service';
import { TYPES } from '../di/types';
import { TypesDaoLite } from './types.lite.dao';
import { EventEmitter, Type, Event } from '../events/eventEmitter.service';

@injectable()
export class TypesServiceLite implements TypesService {

    constructor( @inject(TYPES.TypesDao) private typesDao:TypesDaoLite,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter) {}

    public async validateSubType(templateId:string, category:TypeCategory, document:object, op:Operation): Promise<SchemaValidationResult> {
        logger.debug(`types.lite.service validateSubType: in: templateId: ${templateId}, category: ${category}, document: ${JSON.stringify(document)}, op:${op}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async validateType(category:TypeCategory, document:object, _op:Operation): Promise<SchemaValidationResult> {
        logger.debug(`types.lite.service validateType: in: category: ${category}, document: ${JSON.stringify(document)}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async get(templateId: string, category: TypeCategory, status?: TypeDefinitionStatus): Promise<TypeModel> {
        logger.debug(`types.lite.service get: in: templateId: ${templateId}, category: ${category}, status: ${status}`);

        ow(templateId, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty.includes(TypeCategory.Device));
        ow(status, ow.undefined);

        const r  = await this.typesDao.get(templateId);
        logger.debug(`types.lite.service get: exit: ${r}`);
        return r;
    }

    public async list(category:TypeCategory, status:TypeDefinitionStatus, offset?:number, count?:number): Promise<TypeModel[]> {
        logger.debug(`types.lite.service list: in: category:${category}, status:${status}, offset:${offset}, count:${count}`);

        // validation
        ow(category, ow.string.nonEmpty.includes(TypeCategory.Device));
        ow(status, ow.undefined);

        const r = this.typesDao.list();

        logger.debug('types.full.service create: exit:');
        return r;
    }

    public async create(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult> {
        logger.debug(`types.lite.service create: in: templateId:${templateId}, category:${category}, definition:${JSON.stringify(definition)}`);

        // validation
        ow(templateId, ow.string.nonEmpty);
        // only device types supported under AWS IoT
        ow(category, ow.string.nonEmpty.includes(TypeCategory.Device));
        if (definition) {
            if (definition.properties) {
                // only maximum of 3 attributes allowed per type
                ow(Object.keys(definition.properties), ow.array.maxLength(3));

                // only string types supported
                for (const key of Object.keys(definition.properties)) {
                    for (const type of definition.properties[key].type) {
                        ow(type, ow.string.equals('string'));
                    }
                }
            }

            // the following are not supported in the Lite version
            ow(definition.required, ow.undefined);
            ow(definition.relations, ow.undefined);
            ow(definition.components, ow.undefined);
        }

        // TODO: move to an assembler function
        const model = new TypeModel();
        model.templateId = templateId;
        model.category = category;
        const schema = new TypeVersionModel();
        schema.definition = definition;
        model.schema = schema;

        // save to datastore
        await this.typesDao.create(model);

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: Type.deviceTemplate,
            event: Event.create,
            payload: JSON.stringify(model)
        });

        const r:SchemaValidationResult= {isValid:true};
        logger.debug(`types.lite.service create: exit: ${JSON.stringify(r)}`);
        return r;
    }

    public async delete(templateId:string, category:TypeCategory): Promise<void> {
        logger.debug(`types.lite.service delete: in: templateId:${templateId}, category:${category}`);

        ow(templateId, ow.string.nonEmpty);
        ow(category, ow.string.nonEmpty);

        const model = await this.get(templateId, category);
        await this.typesDao.deprecate(templateId);

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: (category===TypeCategory.Group) ? Type.groupTemplate : Type.deviceTemplate,
            event: Event.delete,
            payload: JSON.stringify(model)
        });

        logger.debug('types.lite.service delete: exit:');
    }

    public async update(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult> {
        logger.debug(`types.lite.service update: in: templateId:${templateId}, category:${category}, definition:${JSON.stringify(definition)}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async publish(templateId:string, category:TypeCategory): Promise<void> {
        logger.debug(`types.lite.service publish: in: templateId:${templateId}, category:${category}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async validateRelationshipsByType(templateId:string, out:{ [key: string] : string[]}): Promise<boolean> {
        logger.debug(`types.lite.service validateRelationships: in: templateId:${templateId}, out:${JSON.stringify(out)}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async validateRelationshipsByPath(templateId:string, out:{ [key: string] : string[]}): Promise<boolean> {
        // example:  in: templateId:edge, out:{"manufactured_by":["/suppliers/bosch"]
        logger.debug(`types.lite.service validateRelationshipsByPath: in: templateId:${templateId}, out:${JSON.stringify(out)}`);
        throw new Error('NOT_SUPPORTED');
    }

}
