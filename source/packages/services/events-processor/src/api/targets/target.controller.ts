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
import { Request, Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpDelete,
    httpPost,
    interfaces,
    request,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';
import { TYPES } from '../../di/types';
import { handleError } from '../../utils/errors.util';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { TargetAssembler } from './target.assembler';
import { TargetService } from './target.service';
import { TargetResource, TargetTypeStrings } from './targets.models';

@controller('/subscriptions/:subscriptionId/targets/:targetType')
export class TargetController implements interfaces.Controller {
    constructor(
        @inject(TYPES.SubscriptionService) private subscriptionService: SubscriptionService,
        @inject(TYPES.TargetService) private targetService: TargetService,
        @inject(TYPES.TargetAssembler) private targetAssembler: TargetAssembler,
    ) {}

    @httpPost('')
    public async createTarget(
        @requestParam('subscriptionId') subscriptionId: string,
        @requestParam('targetType') targetType: TargetTypeStrings,
        @requestBody() resource: TargetResource,
        @request() req: Request,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `target.controller createTarget: in: subscriptionId:${subscriptionId}, targetType:${targetType}, resource:${JSON.stringify(
                resource,
            )}`,
        );

        try {
            this.verifyIsV2(req);

            const item = this.targetAssembler.toItem(subscriptionId, resource, targetType);
            const id = await this.targetService.create(item);
            res.location(
                `/subscriptions/${id.subscriptionId}/targets/${id.targetType}/${id.targetId}`,
            );
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`target.controller createTarget: exit:`);
    }

    @httpDelete('/:targetId')
    public async deleteTarget(
        @requestParam('subscriptionId') subscriptionId: string,
        @requestParam('targetType') targetType: string,
        @requestParam('targetId') targetId: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `target.controller deleteTarget: in: subscriptionId:${subscriptionId}, targetType:${targetType}, targetId:${targetId}`,
        );

        try {
            this.verifyIsV2(req);

            // note: this call may seem like a code smell by using the subscription service to delete a target. But its
            // implementation is intentional, as safely deleting a target requires querying subscription level data that
            // is not available at the target service.
            await this.subscriptionService.safeDeleteTarget(
                subscriptionId,
                targetType as TargetTypeStrings,
                targetId,
            );
        } catch (e) {
            handleError(e, res);
        }

        logger.debug(`target.controller deleteTarget: exit:`);
    }

    private verifyIsV2(req: Request): void {
        // V2 specific endpoint
        if (!req['version'].startsWith('2.')) {
            throw new Error('NOT_SUPPORTED');
        }
    }
}
