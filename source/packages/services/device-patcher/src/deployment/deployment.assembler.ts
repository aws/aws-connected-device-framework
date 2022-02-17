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
import {DeploymentResource, DeploymentItem, DeploymentListResource} from './deployment.model';
import {DeploymentListPaginationKey} from './deploymentTask.dao';

@injectable()
export class DeploymentAssembler {

    public toItem(res: DeploymentResource): DeploymentItem {
        logger.debug(`deployment.assembler fromResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`deployment.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item = new DeploymentItem();

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });

        logger.debug(`deployment.assembler fromResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public toResource(item: DeploymentItem): (DeploymentResource) {
        logger.debug(`deployment.assembler toResource: in: item: ${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`deployment.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = new DeploymentResource();

        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`deployment.assembler toResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toListResource(items: DeploymentItem[], count?:number, paginateFrom?:DeploymentListPaginationKey): DeploymentListResource {
        logger.debug(`deployment.assembler toListResource: in: items:${JSON.stringify(items)}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`);

        const list:DeploymentListResource= {
            deployments:[]
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
            list.deployments = items.map(i=> this.toResource(i))
        }

        logger.debug(`deployment.assembler toListResource: exit: ${JSON.stringify(list)}`);
        return list;
    }
}
