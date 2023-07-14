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

import { GroupsAssembler } from './groups.assembler';
import { GroupsDao } from './groups.dao';
import { GroupItemList } from './groups.models';

@injectable()
export class GroupsService {
    constructor(
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDao,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler
    ) {}

    public async getBulk(groupPaths: string[]): Promise<GroupItemList> {
        logger.debug(`groups.full.service get: in: groupPath: ${groupPaths}`);

        ow(groupPaths, ow.array.nonEmpty);

        // any ids need to be lowercase
        groupPaths = groupPaths.map((g) => g.toLowerCase());

        const result = await this.groupsDao.get(groupPaths);

        const model = this.groupsAssembler.toGroupItems(result);
        logger.debug(`groups.full.service get: exit: model: ${JSON.stringify(model)}`);
        return { results: model };
    }
}
