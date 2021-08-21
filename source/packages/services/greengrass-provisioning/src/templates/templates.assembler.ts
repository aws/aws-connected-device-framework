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
import { TemplateResource, TemplateItem, TemplateResourceList, TemplateItemList } from './templates.models';

@injectable()
export class TemplatesAssembler {

    public fromResource(res: TemplateResource): TemplateItem {
        logger.debug(`templates.assembler fromResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`templates.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item= {};

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });

        logger.debug(`templates.assembler fromResource: exit: item: ${JSON.stringify(item)}`);
        return item as TemplateItem;

    }

    public toResource(item: TemplateItem): (TemplateResource) {
        logger.debug(`templates.assembler toResource: in: item: ${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`templates.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = {};
        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`templates.assembler toResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource as TemplateResource;

    }

    public toResourceList(items:TemplateItemList): TemplateResourceList {
        logger.debug(`templates.assembler toResourceList: in: items:${JSON.stringify(items)}`);

        const list:TemplateResourceList= {
            templates:[],
            pagination: items.pagination
        };

        items.templates.forEach(i=> list.templates.push(this.toResource(i)));

        logger.debug(`templates.assembler toResourceList: exit: ${JSON.stringify(list)}`);
        return list;

    }
}
