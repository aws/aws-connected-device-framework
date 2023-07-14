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

import { SortKeys } from '../data/model';
import { TypeCategory } from './constants';
import { SchemaValidationResult } from './schemaValidator.full.service';
import { TypeDefinitionModel, TypeDefinitionStatus, TypeModel } from './types.models';

export interface TypesService {
    get(
        templateId: string,
        category: TypeCategory,
        status: TypeDefinitionStatus,
    ): Promise<TypeModel>;

    list(
        category: TypeCategory,
        status: TypeDefinitionStatus,
        offset?: number,
        count?: number,
        sort?: SortKeys,
    ): Promise<TypeModel[]>;

    create(
        templateId: string,
        category: TypeCategory,
        definition: TypeDefinitionModel,
    ): Promise<SchemaValidationResult>;

    delete(templateId: string, category: TypeCategory): Promise<void>;

    update(
        templateId: string,
        category: TypeCategory,
        definition: TypeDefinitionModel,
    ): Promise<SchemaValidationResult>;

    publish(templateId: string, category: TypeCategory): Promise<void>;
}
