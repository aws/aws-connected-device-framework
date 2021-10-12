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
import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import {logger} from '../../utils/logger.util';
import ow from 'ow';
import { FilterService } from '../../filter/filter.service';
import { CommonEvent } from '../../transformers/transformers.model';

@injectable()
export class ApigwTriggerService {

    constructor(@inject(TYPES.FilterService) private filter: FilterService) {
    }

    public async invoke(event: CommonEvent) : Promise<void> {
        logger.debug(`apigwtrigger.service invoke: in: model:${JSON.stringify(event)}`);

        // validate input
        ow(event,'resource', ow.object.nonEmpty);
        ow(event.eventSourceId, ow.string.nonEmpty);
        ow(event.principal, ow.string.nonEmpty);
        ow(event.principalValue, ow.string.nonEmpty);

        // process the message
        await this.filter.filter([event]);
 
        logger.debug(`apigwtrigger.service invoke: exit`);
    }

}
