/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpDelete, requestParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import {logger} from '../utils/logger.util';
import {handleError} from '../utils/errors';
import { TYPES } from '../di/types';
import { GreengrassSubscriptionResourceList, GreengrassSubscriptionDeleteResourceList } from './subscriptions.models';
import { SubscriptionsService } from './subscriptions.service';

@controller('')
export class SubscriptionsController implements interfaces.Controller {

    constructor( @inject(TYPES.SubscriptionsService) private subscriptionsService: SubscriptionsService) {}

    @httpPost('/groups/:groupName/subscriptions')
    public async addSubscriptions(@requestParam('groupName') groupName: string, @requestBody() subscriptions:GreengrassSubscriptionResourceList, @response() res:Response) : Promise<void> {
        logger.info(`subscriptions.controller addSubscriptions: in: groupName:${groupName}, subscriptions:${JSON.stringify(subscriptions)}`);

        try {
            await this.subscriptionsService.updateSubscriptionDefinition(groupName, subscriptions.subscriptions, []);
            res.status(201);

        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`subscriptions.controller addSubscriptions: exit:`);
    }

    @httpDelete('/groups/:groupName/subscriptions/:id')
    public async deleteSubscription(@requestParam('groupName') groupName: string, @requestParam('id') id: string, @response() res:Response) : Promise<void> {
        logger.info(`subscriptions.controller deleteSubscription: in: groupName:${groupName}, id:${id}`);

        try {
            await this.subscriptionsService.updateSubscriptionDefinition(groupName, [], [id]);
            res.status(204);

        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`subscriptions.controller deleteSubscription: exit:`);
    }

    @httpDelete('/groups/:groupName/subscriptions')
    public async deleteSubscriptions(@requestParam('groupName') groupName: string, @requestBody() subscriptions:GreengrassSubscriptionDeleteResourceList, @response() res:Response) : Promise<void> {
        logger.info(`subscriptions.controller deleteSubscriptions: in: groupName:${groupName}, subscriptions:${JSON.stringify(subscriptions)}`);

        try {
            await this.subscriptionsService.updateSubscriptionDefinition(groupName, [], subscriptions.ids);
            res.status(204);

        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`subscriptions.controller deleteSubscriptions: exit:`);
    }
}
