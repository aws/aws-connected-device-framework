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

import { logger } from '../utils/logger.util';
import { TemplateListPaginationKey } from './template.dao';
import {
    DeploymentTemplateItem,
    DeploymentTemplateResource,
    DeploymentTemplatesListResource
} from './template.model';
import {DeploymentItem, DeploymentResource} from '../deployment/deployment.model';

@injectable()
export class DeploymentTemplateAssembler {

    public toResource(item: DeploymentTemplateItem): DeploymentTemplateResource {
        logger.debug(`templates.assembler toResource: in: item:${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`deployment.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = new DeploymentResource();

        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`DeploymentTemplates.assembler toResource: exit:${JSON.stringify(resource)}`);
        return resource;
    }

    public toItem(res:DeploymentTemplateResource): DeploymentTemplateItem {
        logger.debug(`Deploymenttemplate.assembler toItem: in: resource:${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`deploymentTemplate.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item = new DeploymentItem();

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });


        logger.debug(`DeploymentTemplates.assembler toItem: exit:${JSON.stringify(item)}`);
        return item;
    }

    public toListResource(items:DeploymentTemplateItem[], count?:number, paginateFrom?:TemplateListPaginationKey ): DeploymentTemplatesListResource {
        logger.debug(`DeploymentTemplates.assembler toListResource: in: items:${JSON.stringify(items)}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`);

        const list:DeploymentTemplatesListResource= {
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

        logger.debug(`DeploymentTemplates.assembler toListResource: exit: ${JSON.stringify(list)}`);
        return list;

    }
}
