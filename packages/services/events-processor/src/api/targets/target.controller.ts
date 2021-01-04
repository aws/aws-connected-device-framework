/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response, Request } from 'express';
import { interfaces, controller, response, request, requestBody, httpPost, requestParam, httpDelete} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../../di/types';
import {logger} from '../../utils/logger.util';
import {handleError} from '../../utils/errors.util';
import { TargetAssembler } from './target.assembler';
import { TargetResource, TargetTypeStrings } from './targets.models';
import { TargetService } from './target.service';
import { SubscriptionService } from '../subscriptions/subscription.service';

@controller('/subscriptions/:subscriptionId/targets/:targetType')
export class TargetController implements interfaces.Controller {

    constructor(
        @inject(TYPES.SubscriptionService) private subscriptionService: SubscriptionService,
        @inject(TYPES.TargetService) private targetService: TargetService,
        @inject(TYPES.TargetAssembler) private targetAssembler: TargetAssembler) {}

    @httpPost('')
    public async createTarget(@requestParam('subscriptionId') subscriptionId: string, @requestParam('targetType') targetType: TargetTypeStrings,
        @requestBody() resource:TargetResource, @request() req:Request, @response() res: Response) : Promise<void> {
        logger.debug(`target.controller createTarget: in: subscriptionId:${subscriptionId}, targetType:${targetType}, resource:${JSON.stringify(resource)}`);

        try {
            this.verifyIsV2(req);

            const item = this.targetAssembler.toItem(subscriptionId, resource, targetType);
            const id = await this.targetService.create(item);
            res.location(`/subscriptions/${id.subscriptionId}/targets/${id.targetType}/${id.targetId}`);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`target.controller createTarget: exit:`);
    }

    @httpDelete('/:targetId')
    public async deleteTarget(@requestParam('subscriptionId') subscriptionId: string, @requestParam('targetType') targetType: string,
        @requestParam('targetId') targetId: string, @request() req:Request, @response() res: Response): Promise<void> {
        logger.debug(`target.controller deleteTarget: in: subscriptionId:${subscriptionId}, targetType:${targetType}, targetId:${targetId}`);

        try {
            this.verifyIsV2(req);

            // note: this call may seem like a code smell by using the subscription service to delete a target. But its
            // implementation is intentional, as safely deleting a target requires querying subscription level data that
            // is not available at the target service.
            await this.subscriptionService.safeDeleteTarget(subscriptionId, targetType as TargetTypeStrings, targetId);
        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`target.controller deleteTarget: exit:`);
    }

    private verifyIsV2(req:Request) : void {
        // V2 specific endpoint
        if (!req['version'].startsWith('2.')) {
            throw new Error('NOT_SUPPORTED');
        }
    }

}
