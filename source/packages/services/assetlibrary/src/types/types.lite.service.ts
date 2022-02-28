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
import {logger} from '../utils/logger';
import { TypeModel, TypeDefinitionModel, TypeDefinitionStatus} from './types.models';
import { SchemaValidationResult } from './schemaValidator.full.service';
import {TypeCategory} from './constants';
import ow from 'ow';
import { TypesService } from './types.service';
import { TYPES } from '../di/types';
import { TypesDaoLite } from './types.lite.dao';
import { EventEmitter, Type, Event } from '../events/eventEmitter.service';
import { SortKeys } from '../data/model';
import { NotSupportedError } from '../utils/errors';

@injectable()
export class TypesServiceLite implements TypesService {

    constructor( @inject(TYPES.TypesDao) private typesDao:TypesDaoLite,
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter) {}

    public async get(templateId: string, category: TypeCategory, status?: TypeDefinitionStatus): Promise<TypeModel> {
        logger.debug(`types.lite.service get: in: templateId: ${templateId}, category: ${category}, status: ${status}`);

        ow(templateId,'templateId', ow.string.nonEmpty);
        ow(category,'category', ow.string.nonEmpty.includes(TypeCategory.Device));
        ow(status, ow.undefined);

        const r  = await this.typesDao.get(templateId);
        logger.debug(`types.lite.service get: exit: ${r}`);
        return r;
    }

    public async list(category:TypeCategory, status:TypeDefinitionStatus, offset?:number, count?:number, sort?:SortKeys): Promise<TypeModel[]> {
        logger.debug(`types.lite.service list: in: category:${category}, status:${status}, offset:${offset}, count:${count}, sort:${JSON.stringify(sort)}`);

        // validation
        ow(category,'category', ow.string.nonEmpty.includes(TypeCategory.Device));
        ow(status, ow.undefined);

        const r = this.typesDao.list();

        logger.debug('types.full.service create: exit:');
        return r;
    }

    public async create(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult> {
        logger.debug(`types.lite.service create: in: templateId:${templateId}, category:${category}, definition:${JSON.stringify(definition)}`);

        // validation
        ow(templateId,'templateId', ow.string.nonEmpty);
        // only device types supported under AWS IoT
        ow(category,'category', ow.string.nonEmpty.includes(TypeCategory.Device));
        if (definition) {
            if (definition.properties) {
                // only maximum of 3 attributes allowed per type
                ow(Object.keys(definition.properties), ow.array.maxLength(3));

                // only string types supported
                for (const key of Object.keys(definition.properties)) {
                    for (const type of definition.properties[key].type) {
                        ow(type,'type', ow.string.equals('string'));
                    }
                }
            }

            // the following are not supported in the Lite version
            ow(definition.required, ow.undefined);
            ow(definition.relations, ow.undefined);
            ow(definition.components, ow.undefined);
        }

        // TODO: move to an assembler function
        const model:TypeModel = {
            templateId,
            category,
            schema: {
                definition
            }
        };

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

        ow(templateId,'templateId', ow.string.nonEmpty);
        ow(category,'category', ow.string.nonEmpty);

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
        throw new NotSupportedError();
    }

    public async publish(templateId:string, category:TypeCategory): Promise<void> {
        logger.debug(`types.lite.service publish: in: templateId:${templateId}, category:${category}`);
        throw new NotSupportedError();
    }
}
