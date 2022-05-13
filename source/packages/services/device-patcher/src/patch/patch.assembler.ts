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
import { injectable } from 'inversify';
import {logger} from '../utils/logger.util';
import {PatchResource, PatchItem, PatchListResource} from './patch.model';
import {PatchListPaginationKey} from './patchTask.dao';

@injectable()
export class PatchAssembler {

    public toItem(res: PatchResource): PatchItem {
        logger.debug(`patch.assembler fromResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`patch.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item = new PatchItem();

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });

        logger.debug(`patch.assembler fromResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public toResource(item: PatchItem): (PatchResource) {
        logger.debug(`patch.assembler toResource: in: item: ${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`patch.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = new PatchResource();

        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`patch.assembler toResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toListResource(items: PatchItem[], count?:number, paginateFrom?:PatchListPaginationKey): PatchListResource {
        logger.debug(`patch.assembler toListResource: in: items:${JSON.stringify(items)}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`);

        const list:PatchListResource= {
            patches:[]
        };

        if (count!==undefined || paginateFrom!==undefined) {
            list.pagination = {};
        }

        if (count!==undefined) {
            list.pagination.count=count;
        }

        if (paginateFrom!==undefined) {
            list.pagination.lastEvaluated = {
                nextToken: paginateFrom?.nextToken
            };
        }

        if ((items?.length??0)>0) {
            list.patches = items.map(i=> this.toResource(i))
        }

        logger.debug(`patch.assembler toListResource: exit: ${JSON.stringify(list)}`);
        return list;
    }
}
