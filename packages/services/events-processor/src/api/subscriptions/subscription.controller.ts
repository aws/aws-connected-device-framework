/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This subscriptionSource code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../../di/types';
import {logger} from '../../utils/logger';
import {handleError} from '../../utils/errors';
import { SubscriptionService } from './subscription.service';
import { SubscriptionResource } from './subscription.models';

@controller('/subscriptions')
export class SubscriptionController implements interfaces.Controller {

    constructor( @inject(TYPES.SubscriptionService) private subscriptionService: SubscriptionService) {}

    @httpPost('')
    public async createSubscription(@requestBody() subscription:SubscriptionResource, @response() res: Response) {
        logger.debug(`subscription.controller createSubscription: in: subscription:${JSON.stringify(subscription)}`);

        try {
            await this.subscriptionService.create(subscription);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`subscription.controller createSubscription: exit:`);
    }

}
