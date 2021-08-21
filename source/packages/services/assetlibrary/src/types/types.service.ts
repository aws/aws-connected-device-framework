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

import { TypeModel, TypeDefinitionModel, TypeDefinitionStatus } from './types.models';
import { SchemaValidationResult } from '../utils/schemaValidator.service';
import {TypeCategory, Operation} from './constants';
import { DirectionStringToArrayMap, SortKeys } from '../data/model';

export interface TypesService {

    validateSubType(templateId:string, category:TypeCategory, document:unknown, op:Operation): Promise<SchemaValidationResult>;

    validateType(category:TypeCategory, document:unknown, op:Operation): Promise<SchemaValidationResult>;

    get(templateId: string, category: TypeCategory, status: TypeDefinitionStatus): Promise<TypeModel>;

    list(category:TypeCategory, status:TypeDefinitionStatus, offset?:number, count?:number, sort?:SortKeys): Promise<TypeModel[]>;

    create(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult>;

    delete(templateId:string, category:TypeCategory): Promise<void> ;

    update(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult>;

    publish(templateId:string, category:TypeCategory): Promise<void>;

    validateRelationshipsByType(templateId:string, rels:DirectionStringToArrayMap): Promise<boolean>;

    validateRelationshipsByPath(templateId:string, rels:DirectionStringToArrayMap): Promise<boolean>;

}
