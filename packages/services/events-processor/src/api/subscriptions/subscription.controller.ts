/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam, httpDelete, queryParam} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../../di/types';
import {logger} from '../../utils/logger.util';
import {handleError} from '../../utils/errors.util';
import { SubscriptionService } from './subscription.service';
import { SubscriptionResource, SubscriptionResourceList } from './subscription.models';

@controller('')
export class SubscriptionController implements interfaces.Controller {

    constructor( @inject(TYPES.SubscriptionService) private subscriptionService: SubscriptionService) {}

    @httpPost('/events/:eventId/subscriptions')
    public async createSubscription(@requestParam('eventId') eventId: string, @requestBody() subscription:SubscriptionResource, @response() res: Response) {
        logger.debug(`subscription.controller createSubscription: in: eventId:${eventId}, subscription:${JSON.stringify(subscription)}`);

        subscription.event= {id:eventId};
        try {
            const id = await this.subscriptionService.create(subscription);
            res.location(`/subscriptions/${id}`);
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`subscription.controller createSubscription: exit:`);
    }

    @httpGet('/subscriptions/:subscriptionId')
    public async getSubscription(@requestParam('subscriptionId') subscriptionId: string, @response() res: Response): Promise<SubscriptionResource> {
        logger.debug(`subscription.controller getSubscription: in: subscriptionId:${subscriptionId}`);

        let model;
        try {
            model = await this.subscriptionService.get(subscriptionId);

            if (model===undefined) {
                res.status(404).end();
            }
        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`subscription.controller getSubscription: exit: ${JSON.stringify(model)}`);
        return model;
    }

    @httpDelete('/subscriptions/:subscriptionId')
    public async deleteSubscription(@requestParam('subscriptionId') subscriptionId: string, @response() res: Response): Promise<void> {
        logger.debug(`subscription.controller deleteSubscription: in: subscriptionId:${subscriptionId}`);

        try {
            await this.subscriptionService.delete(subscriptionId);
        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`subscription.controller deleteSubscription: exit:`);
    }

    @httpGet('/users/:userId/subscriptions')
    public async listSubscriptionsForUser(@requestParam('userId') userId: string, @response() res: Response): Promise<SubscriptionResourceList> {
        logger.debug(`subscription.controller listSubscriptionsForUser: in: userId:${userId}`);

        let model;
        try {
            model = await this.subscriptionService.listByUser(userId);

            if (model===undefined) {
                res.status(404).end();
            }
        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`subscription.controller listSubscriptionsForUser: exit: ${JSON.stringify(model)}`);
        return model;
    }

    @httpGet('/events/:eventId/subscriptions')
    public async listSubscriptionsForEvent(@requestParam('eventId') eventId: string, @queryParam('fromSubscriptionId') fromSubscriptionId:string,
        @response() res: Response): Promise<SubscriptionResourceList> {

        logger.debug(`subscription.controller listSubscriptionsForEvent: in: eventId:${eventId}, fromSubscriptionId:${fromSubscriptionId}`);

        let model;
        try {
            let from;
            if (fromSubscriptionId!==undefined && fromSubscriptionId.length>0) {
                from = {
                    eventId,
                    subscriptionId: fromSubscriptionId
                };
            }
            model = await this.subscriptionService.listByEvent(eventId, from);

            if (model===undefined) {
                res.status(404).end();
            }

        } catch (e) {
            handleError(e,res);
        }

        logger.debug(`subscription.controller listSubscriptionsForEvent: exit: ${JSON.stringify(model)}`);
        return model;
    }

}
