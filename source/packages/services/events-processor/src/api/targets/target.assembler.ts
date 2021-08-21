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
import {logger} from '../../utils/logger.util';
import { TargetResource, TargetItem, TargetTypeStrings, TargetItemFactory, TargetResourceFactory } from './targets.models';

@injectable()
export class TargetAssembler {

    public toItems<R extends TargetResource, I extends TargetItem>(subscriptionId:string, resources:R[], targetType: TargetTypeStrings) : I[] {
        logger.debug(`target.assembler toItems: in: subscriptionId:${subscriptionId}, resources:${JSON.stringify(resources)}, targetType:${targetType}`);

        if (resources===undefined) {
            return undefined;
        }

        const items : TargetItem[] = [];
        for (const r of resources) {
            items.push( this.toItem(subscriptionId, r, targetType));
        }

        logger.debug(`target.assembler toItems: exit: ${JSON.stringify(items)}`);
        return items as I[];
    }

    public toItem<R extends TargetResource, I extends TargetItem>(subscriptionId:string, resource:R, targetType: TargetTypeStrings) : I {
        logger.debug(`target.assembler toItem: in: subscriptionId:${subscriptionId}, resource:${JSON.stringify(resource)}, targetType:${targetType}`);

        if (resource===undefined) {
            // nothing to do
            return undefined;
        }

        const item = TargetItemFactory.getTargetItem(targetType);
        item.subscriptionId=subscriptionId;

        Object.assign(item, resource);

        logger.debug(`target.assembler toItem: exit: ${JSON.stringify(item)}`);
        return item as I;
    }

    public toResource<R extends TargetResource, I extends TargetItem>(item:I): R {
        logger.debug(`target.assembler toResource: in: item:${JSON.stringify(item)}`);

        if (item?.targetType===undefined) {
            return undefined;
        }

        const resource = TargetResourceFactory.getTargetResource(item.targetType);

        Object.keys(item).forEach(key=> {
            if (key!=='subscriptionId' && key!=='targetType') {
                resource[key] = item[key];
            }
        });

        logger.debug(`target.assembler toResource: exit: node: ${JSON.stringify(resource)}`);
        return resource as R;

    }

    public toResources<R extends TargetResource, I extends TargetItem>(items:I[]) : R[] {
        logger.debug(`target.assembler toResources: items:${JSON.stringify(items)}`);

        if (items===undefined) {
            return undefined;
        }
        const resources : TargetResource[] = [];
        for (const i of items) {
            resources.push( this.toResource(i));
        }

        logger.debug(`target.assembler toResources: exit: ${JSON.stringify(resources)}`);
        return resources as R[];
    }
}
