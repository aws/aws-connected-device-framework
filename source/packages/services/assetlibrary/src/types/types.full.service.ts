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
import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { SortKeys } from '../data/model';
import { TYPES } from '../di/types';
import { Event, EventEmitter, Type } from '../events/eventEmitter.service';
import { InvalidCategoryError, TemplateInUseError, TemplateNotFoundError } from '../utils/errors';
import { TypeUtils } from '../utils/typeUtils';
import { Operation, TypeCategory } from './constants';
import { SchemaValidationResult, SchemaValidatorService } from './schemaValidator.full.service';
import { TypesDaoFull } from './types.full.dao';
import {
    RelationTarget,
    TypeDefinitionModel,
    TypeDefinitionStatus,
    TypeModel,
    isRelationTargetExpanded,
} from './types.models';
import { TypesService } from './types.service';

@injectable()
export class TypesServiceFull implements TypesService {
    constructor(
        @inject(TYPES.SchemaValidatorService) private validator: SchemaValidatorService,
        @inject(TYPES.TypesDao) private typesDao: TypesDaoFull,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
        @inject(TYPES.TypeUtils) private typeUtils: TypeUtils
    ) {}

    public async get(
        templateId: string,
        category: TypeCategory,
        status: TypeDefinitionStatus
    ): Promise<TypeModel> {
        logger.debug(
            `types.full.service get: in: templateId: ${templateId}, category: ${category}, status: ${status}`
        );

        ow(templateId, 'templateId', ow.string.nonEmpty);
        ow(category, 'category', ow.string.nonEmpty);

        if (status === undefined) {
            status = TypeDefinitionStatus.published;
        }

        // any ids need to be lowercase
        templateId = templateId.toLowerCase();

        const result = await this.typesDao.get(templateId, category, status);
        if (result !== undefined) {
            result.schema.definition.relations = result.schema.relations;

            // retrieve the component definitions
            if (result.schema.definition.components?.length > 0) {
                result.schema.definition.componentTypes = [];
                for (const componentTemplateId of result.schema.definition.components) {
                    result.schema.definition.componentTypes.push(
                        await this.get(componentTemplateId, TypeCategory.Device, status)
                    );
                }
            }
        }

        logger.debug(`types.full.service get: exit: ${JSON.stringify(result)}`);
        return result;
    }

    public async list(
        category: TypeCategory,
        status: TypeDefinitionStatus,
        offset?: number,
        count?: number,
        sort?: SortKeys
    ): Promise<TypeModel[]> {
        logger.debug(
            `types.full.service list: in: category:${category}, status:${status}, offset:${offset}, count:${count}, sort:${JSON.stringify(
                sort
            )}`
        );

        ow(category, 'category', ow.string.nonEmpty);
        const { offsetAsInt, countAsInt } = this.typeUtils.parseAndValidateOffsetAndCount(
            offset,
            count
        );

        if (status === undefined) {
            status = TypeDefinitionStatus.published;
        }

        const results = await this.typesDao.list(category, status, offsetAsInt, countAsInt, sort);
        if (results !== undefined && results.length >= 0) {
            for (const r of results) {
                r.schema.definition.relations = r.schema.relations;
            }
        }
        return results;
    }

    private async validateRelations(definition: TypeDefinitionModel): Promise<boolean> {
        logger.debug(
            `types.full.service validateRelations: in: definition:${JSON.stringify(definition)}`
        );

        let linkedTargetsValid = true;

        // validate that any types provided as part of the in/out relations exist
        if (definition.relations !== undefined) {
            let linkedTargetNames: string[] = [];
            if (definition.relations.out !== undefined) {
                Object.values(definition.relations.out).forEach((v) =>
                    v
                        .map((v2) => (isRelationTargetExpanded(v2) ? v2 : { name: v2 }))
                        .forEach((v2) => linkedTargetNames.push(v2.name))
                );
            }
            if (definition.relations.in !== undefined) {
                Object.values(definition.relations.in).forEach((v) =>
                    v
                        .map((v2) => (isRelationTargetExpanded(v2) ? v2 : { name: v2 }))
                        .forEach((v2) => linkedTargetNames.push(v2.name))
                );
            }
            linkedTargetNames = Array.from(new Set(linkedTargetNames));

            linkedTargetsValid = await this.typesDao.validateLinkedTypesExist(linkedTargetNames);
        }
        logger.debug(`types.full.service create: exit: linkedTargetsValid:${linkedTargetsValid}`);
        return linkedTargetsValid;
    }

    private relatedIdsToLowercase(rels: { [key: string]: RelationTarget[] }): {
        [key: string]: RelationTarget[];
    } {
        /* lowercasting values */
        Object.values(rels).forEach((entities) => {
            entities.forEach((entity) => {
                if (isRelationTargetExpanded(entity)) {
                    entity.name = entity.name.toLowerCase();
                } else {
                    entity = entity.toLowerCase();
                }
            });
        });
        /* lowercasting keys */
        rels = Object.fromEntries(Object.entries(rels).map(([k, v]) => [k.toLowerCase(), v]));
        return rels;
    }

    public async create(
        templateId: string,
        category: TypeCategory,
        definition: TypeDefinitionModel
    ): Promise<SchemaValidationResult> {
        logger.debug(
            `types.full.service create: in: templateId:${templateId}, category:${category}, definition:${JSON.stringify(
                definition
            )}`
        );

        ow(templateId, 'templateId', ow.string.nonEmpty);
        ow(category, 'category', ow.string.nonEmpty);

        let r: SchemaValidationResult;

        // any ids need to be lowercase
        templateId = templateId.toLowerCase();
        if (definition.relations?.in) {
            this.relatedIdsToLowercase(definition.relations.in);
        }
        if (definition.relations?.out) {
            this.relatedIdsToLowercase(definition.relations.out);
        }

        // remove any non printable characters from the id
        templateId = templateId.replace(/[^\x20-\x7E]+/g, '');

        if (!this.isValidCategory(category)) {
            throw new InvalidCategoryError(category);
        }

        // validate the schema
        const validationResult = await this.validator.validateSchema(definition, Operation.CREATE);
        if (!validationResult.isValid) {
            logger.debug(
                `types.full.service create: exit: validationResult:${JSON.stringify(definition)}`
            );
            return validationResult;
        }

        // validate that any types provided as part of the in/out relations exist
        if (!(await this.validateRelations(definition))) {
            r = { isValid: false, errors: { relations: 'Invalid relation types' } };
            logger.debug(`types.full.service create: exit: ${JSON.stringify(r)}`);
            return r;
        }

        // todo: move to an assembler function
        const model: TypeModel = {
            templateId,
            category,
            schema: {
                status: TypeDefinitionStatus.draft,
                version: 1,
                definition,
                relations: definition.relations,
            },
        };
        delete definition.relations;

        // save to datastore
        await this.typesDao.create(model);

        // delete the template cache
        await this.validator.deleteFromCache(templateId);

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: category === TypeCategory.Group ? Type.groupTemplate : Type.deviceTemplate,
            event: Event.create,
            payload: JSON.stringify(model),
        });

        r = { isValid: true };
        logger.debug(`types.full.service create: exit:${JSON.stringify(r)}`);
        return r;
    }

    public async delete(templateId: string, category: TypeCategory): Promise<void> {
        logger.debug(
            `types.full.service delete: in: templateId:${templateId}, category:${category}`
        );

        ow(templateId, 'templateId', ow.string.nonEmpty);
        ow(category, 'category', ow.string.nonEmpty);

        // any ids need to be lowercase
        templateId = templateId.toLowerCase();

        if (!this.isValidCategory(category)) {
            throw new InvalidCategoryError(category);
        }

        //  ensure no devices exist of this template
        const inUse = await this.typesDao.countInUse(templateId);
        if (inUse > 0) {
            throw new TemplateInUseError(templateId);
        }

        const model = await this.get(templateId, category, TypeDefinitionStatus.published);
        await this.typesDao.delete(templateId);

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: category === TypeCategory.Group ? Type.groupTemplate : Type.deviceTemplate,
            event: Event.delete,
            payload: JSON.stringify(model),
        });

        logger.debug('types.full.service delete: exit:');
    }

    public async update(
        templateId: string,
        category: TypeCategory,
        definition: TypeDefinitionModel
    ): Promise<SchemaValidationResult> {
        logger.debug(
            `types.full.service update: in: templateId:${templateId}, category:${category}, definition:${JSON.stringify(
                definition
            )}`
        );

        ow(templateId, 'templateId', ow.string.nonEmpty);
        ow(category, 'category', ow.string.nonEmpty);

        // any ids need to be lowercase
        templateId = templateId.toLowerCase();
        if (definition.relations?.in) {
            this.relatedIdsToLowercase(definition.relations.in);
        }
        if (definition.relations?.out) {
            this.relatedIdsToLowercase(definition.relations.out);
        }

        if (!this.isValidCategory(category)) {
            throw new InvalidCategoryError(category);
        }

        const validationResult = await this.validator.validateSchema(definition, Operation.UPDATE);
        if (!validationResult.isValid) {
            logger.debug(
                `types.full.service update: exit: validationResult:${JSON.stringify(definition)}`
            );
            return validationResult;
        }

        // validate that any types provided as part of the in/out relations exist
        if (!this.validateRelations(definition)) {
            logger.debug('types.full.service create: exit: linkedTypesValid:false');
            return { isValid: false, errors: {} };
        }

        // todo: move to an assembler function
        const model: TypeModel = {
            templateId,
            category,
            schema: {
                status: TypeDefinitionStatus.draft,
                definition,
                relations: definition.relations,
            },
        };
        delete definition.relations;

        // do we have a draft version already?
        const draft = await this.get(model.templateId, model.category, TypeDefinitionStatus.draft);

        // if we do, lets go ahead and update it
        if (draft !== undefined) {
            await this.typesDao.updateDraft(draft, model);
        } else {
            // but if we dont, lets go ahead and create one
            const published = await this.get(
                model.templateId,
                model.category,
                TypeDefinitionStatus.published
            );

            // if we don't have a published one either, then the type does not exist, we can't proceed
            if (published === undefined) {
                throw new TemplateNotFoundError(model.templateId);
            }

            model.schema.version = published.schema.version + 1;
            await this.typesDao.createDraft(model);
        }

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: category === TypeCategory.Group ? Type.groupTemplate : Type.deviceTemplate,
            event: Event.modify,
            payload: JSON.stringify(model),
            attributes: {
                status: 'draft',
            },
        });

        const r: SchemaValidationResult = { isValid: true };
        logger.debug(`types.full.service update: exit:${JSON.stringify(r)}`);
        return r;
    }

    public async publish(templateId: string, category: TypeCategory): Promise<void> {
        logger.debug(
            `types.full.service publish: in: templateId:${templateId}, category:${category}`
        );

        ow(templateId, 'templateId', ow.string.nonEmpty);
        ow(category, 'category', ow.string.nonEmpty);

        // any ids need to be lowercase
        templateId = templateId.toLowerCase();

        if (!this.isValidCategory(category)) {
            throw new InvalidCategoryError(category);
        }

        // save to datastore
        await this.typesDao.publish(templateId, category);

        // fire event
        await this.eventEmitter.fire({
            objectId: templateId,
            type: category === TypeCategory.Group ? Type.groupTemplate : Type.deviceTemplate,
            event: Event.modify,
            attributes: {
                status: 'published',
            },
        });
        logger.debug(`types.full.service publish: exit:`);
    }

    private isValidCategory(category: string): boolean {
        return category === TypeCategory.Device || category === TypeCategory.Group;
    }
}
