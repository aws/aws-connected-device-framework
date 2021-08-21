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
import { logger } from './utils/logger.util';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';
import { FilterService } from './filter/filter.service';

let filter: FilterService;

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
exports.handler = async (event: any, _context: unknown) => {
    logger.debug(`lambda_proxy_invoke handler: event: ${JSON.stringify(event)}`);

    // init
    if (filter === undefined) {
        filter = container.get(TYPES.FilterService);
    }

    // verify the message is in the common message format
    if (event.eventSourceId === undefined) {
        throw new Error('Missing eventSourceId');
    }
    if (event.principal === undefined) {
        throw new Error('Missing principal');
    }
    if (event.principalValue === undefined) {
        throw new Error('Missing principalValue');
    }

    // process the message
    await filter.filter([event]);

    logger.debug(`lambda_proxy_invoke handler: exit:`);

};
