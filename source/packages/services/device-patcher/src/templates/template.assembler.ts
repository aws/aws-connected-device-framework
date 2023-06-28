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

import { logger } from '@awssolutions/simple-cdf-logger';
import { TemplateListPaginationKey } from './template.dao';
import {
    PatchTemplateItem,
    PatchTemplateResource,
    PatchTemplatesListResource
} from './template.model';

@injectable()
export class PatchTemplateAssembler {

    public toResource(item: PatchTemplateItem): PatchTemplateResource {
        logger.debug(`templates.assembler toResource: in: item:${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`patch.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = new PatchTemplateResource();

        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`PatchTemplates.assembler toResource: exit:${JSON.stringify(resource)}`);
        return resource;
    }

    public toItem(res:PatchTemplateResource): PatchTemplateItem {
        logger.debug(`Patchtemplate.assembler toItem: in: resource:${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`patchTemplate.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item = new PatchTemplateItem();

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });


        logger.debug(`PatchTemplates.assembler toItem: exit:${JSON.stringify(item)}`);
        return item;
    }

    public toListResource(items:PatchTemplateItem[], count?:number, paginateFrom?:TemplateListPaginationKey ): PatchTemplatesListResource {
        logger.debug(`PatchTemplates.assembler toListResource: in: items:${JSON.stringify(items)}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`);

        const list:PatchTemplatesListResource= {
            templates:[]
        };

        if (count!==undefined || paginateFrom!==undefined) {
            list.pagination = {};
        }

        if (count!==undefined) {
            list.pagination.count=count;
        }

        if (paginateFrom!==undefined) {
            list.pagination.lastEvaluated = {
                name: paginateFrom?.name
            };
        }

        if ((items?.length??0)>0) {
            items.forEach(i=> list.templates.push(this.toResource(i)));
        }

        logger.debug(`PatchTemplates.assembler toListResource: exit: ${JSON.stringify(list)}`);
        return list;

    }
}
