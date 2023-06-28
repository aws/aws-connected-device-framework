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
import {logger} from '@awssolutions/simple-cdf-logger';
import {PatchTaskResource, PatchTaskItem } from './patchTask.model';

@injectable()
export class PatchTaskAssembler {

    public toItem(res: PatchTaskResource): PatchTaskItem {
        logger.debug(`patchTask.assembler fromResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`patchTask.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item = new PatchTaskItem();

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });

        logger.debug(`activation.assembler fromResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public toResource(item: PatchTaskItem): (PatchTaskResource) {
        logger.debug(`activation.assembler toResource: in: item: ${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`devices.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = new PatchTaskResource();

        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`activation.assembler toResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }
}
