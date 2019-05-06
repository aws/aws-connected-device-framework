/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger.util';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';
import { FilterService } from './filter/filter.service';

let filter: FilterService;

exports.handler = async (event: any, _context: any) => {
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
