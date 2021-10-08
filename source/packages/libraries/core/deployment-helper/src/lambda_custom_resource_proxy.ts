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
import 'reflect-metadata';
import { send } from 'cfn-response-promise';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';

import { logger } from './utils/logger';
import {CustomResourceManager} from './customResources/customResource.manager';
import {CustomResourceEvent} from './customResources/customResource.model';

import {v1 as uuid} from 'uuid';

let customResourceManager:CustomResourceManager;

exports.handler = async (event: CustomResourceEvent, context: unknown) => {
    logger.debug(`event:${JSON.stringify(event)} context: ${JSON.stringify(context)}`);

    if (customResourceManager === undefined) {
        customResourceManager = container.get<CustomResourceManager>(TYPES.CustomResourceManager);
    }

    try {
        const resourceResult = await customResourceManager[event.RequestType.toLowerCase()](event);
        
        logger.debug(`existing PhysicalResourceId: ${event.PhysicalResourceId}`);
        
        const physicalResourceId = event.PhysicalResourceId || uuid();
        
        logger.debug(`Determined PhysicalResourceId:${physicalResourceId}`);
        
        return await send(event, context, 'SUCCESS', resourceResult, physicalResourceId);
    } catch (err) {
        logger.error(err);
        return await send(event, context, 'FAILED', err);
    }

};
