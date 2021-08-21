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
import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { TargetsServiceBase, TargetsService } from './targets.service';
import { TargetResource } from './targets.model';
import { logger } from '../utils/logger';

@injectable()
export class TargetsApigwService extends TargetsServiceBase implements TargetsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('notifications.baseUrl') as string;
    }

    async createTarget(subscriptionId: string, targetType:string, target: TargetResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(target, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.targetsRelativeUrl(subscriptionId, targetType)}`;
        await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(target);
    }

    async deleteTarget(subscriptionId: string, targetType:string, targetId:string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(targetId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.targetRelativeUrl(subscriptionId, targetType, targetId)}`;
        logger.debug(`>>>>> url: ${url}`);
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

}
