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

@controller('/subscriptions/:subscriptionId/targets/:targetType')
export class TargetController implements interfaces.Controller {

    constructor( @inject(TYPES.TargetService) private targetService: TargetService,
    @inject(TYPES.TargetAssembler) private targetAssembler: TargetAssembler) {}

    @httpPost('')
    public async createTarget(@requestParam('subscriptionId') subscriptionId: string, @requestParam('targetType') targetType: TargetTypeStrings,
        @requestBody() resource:TargetResource, @request() req:Request, @response() res: Response) {
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

            await this.targetService.delete(subscriptionId, targetType as TargetTypeStrings, targetId);
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
