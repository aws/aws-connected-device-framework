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
import { logger } from '@awssolutions/simple-cdf-logger';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';
import { DDBStreamTransformer } from './transformers/ddbstream.transformer';
import { FilterService } from './filter/filter.service';

let transformer: DDBStreamTransformer;
let filter: FilterService;

exports.handler = async (event: unknown, _context: unknown) => {
    logger.debug(`lambda_proxy_ddbstream handler: event: ${JSON.stringify(event)}`);

    // init
    if (transformer === undefined) {
        transformer = container.get(TYPES.DDBStreamTransformer);
    }
    if (filter === undefined) {
        filter = container.get(TYPES.FilterService);
    }

    // transform the message
    const commonEvents = await transformer.transform(event);

    if (commonEvents !== undefined && commonEvents.length > 0) {
        // process the message
        await filter.filter(commonEvents);
    }

    logger.debug(`lambda_proxy_ddbstream handler: exit:`);
};
