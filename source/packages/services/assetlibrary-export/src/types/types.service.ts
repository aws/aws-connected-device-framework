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
import { TYPES } from '../di/types';

import { TypeCategory } from './constants';
import { TypesDao } from './types.dao';
import { TypeDefinitionStatus, TypeModel } from './types.models';

@injectable()
export class TypesService implements TypesService {
    constructor(@inject(TYPES.TypesDao) private typesDao: TypesDao) {}

    public async list(
        category: TypeCategory,
        status?: TypeDefinitionStatus
    ): Promise<TypeModel[]> {
        logger.debug(`types.full.service list: in: category:${category}, status:${status}`);

        ow(category, ow.string.nonEmpty);

        if (status === undefined) {
            status = TypeDefinitionStatus.published;
        }

        const results = await this.typesDao.list(category, status);
        if (results !== undefined && results.length >= 0) {
            for (const r of results) {
                r.schema.definition.relations = r.schema.relations;
            }
        }
        return results;
    }
}
