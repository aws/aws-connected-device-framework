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
import {getRequestIdFromContext, logger, setRequestId} from '@awssolutions/simple-cdf-logger';

import {TYPES} from './di/types';
import {container} from './di/inversify.config';

import { ETLService } from './etl/etl.service';

const etlService: ETLService = container.get<ETLService>(TYPES.ETLService);

exports.export_handler = async (event: any, _context: any) => {
    logger.debug(`export_handler: in: event: ${JSON.stringify(event)}`);

    // apply the awsRequestId to the logger so all logs reflect the requestId
    setRequestId(getRequestIdFromContext(_context));

    await etlService.processBatch(event);
};
