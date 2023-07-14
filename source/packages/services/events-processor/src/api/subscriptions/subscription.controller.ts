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
import { Response, Request } from 'express';
import {
    interfaces,
    controller,
    request,
    response,
    requestBody,
    httpPost,
    httpGet,
    requestParam,
    httpDelete,
    httpPatch,
    queryParam,
} from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '../../di/types';
import { logger } from '@awssolutions/simple-cdf-logger';
import { handleError } from '../../utils/errors.util';
import { SubscriptionService } from './subscription.service';
import {
    SubscriptionResourceList,
    SubscriptionBaseResource,
    UpdateSubcriptionRequest,
} from './subscription.models';
import { SubscriptionAssembler } from './subscription.assembler';

@controller('')
export class SubscriptionController implements interfaces.Controller {
    constructor(
        @inject(TYPES.SubscriptionService) private subscriptionService: SubscriptionService,
        @inject(TYPES.SubscriptionAssembler) private subscriptionAssembler: SubscriptionAssembler,
    ) {}

    @httpPost('/events/:eventId/subscriptions')
    public async createSubscription(
        @requestParam('eventId') eventId: string,
        @requestBody() resource: SubscriptionBaseResource,
        @request() req: Request,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `subscription.controller createSubscription: in: eventId:${eventId}, resource:${JSON.stringify(
                resource,
            )}`,
        );

        resource.event = { id: eventId };
        try {
            const item = this.subscriptionAssembler.toItem(resource, req['version']);
            const id = await this.subscriptionService.create(item);
            res.location(`/subscriptions/${id}`);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`subscription.controller createSubscription: exit:`);
    }

    @httpGet('/subscriptions/:subscriptionId')
    public async getSubscription(
        @requestParam('subscriptionId') subscriptionId: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<SubscriptionBaseResource> {
        logger.debug(
            `subscription.controller getSubscription: in: subscriptionId:${subscriptionId}`,
        );

        let resource: SubscriptionBaseResource;
        try {
            const item = await this.subscriptionService.get(subscriptionId);

            if (item === undefined) {
                res.status(404).end();
            }

            resource = this.subscriptionAssembler.toResource(item, req['version']);
        } catch (e) {
            handleError(e, res);
        }

        logger.debug(`subscription.controller getSubscription: exit: ${JSON.stringify(resource)}`);
        return resource;
    }

    @httpDelete('/subscriptions/:subscriptionId')
    public async deleteSubscription(
        @requestParam('subscriptionId') subscriptionId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `subscription.controller deleteSubscription: in: subscriptionId:${subscriptionId}`,
        );

        try {
            await this.subscriptionService.delete(subscriptionId);
        } catch (e) {
            handleError(e, res);
        }

        logger.debug(`subscription.controller deleteSubscription: exit:`);
    }

    @httpPatch('/subscriptions/:subscriptionId')
    public async updateSubscription(
        @requestParam('subscriptionId') subscriptionId: string,
        @requestBody() resource: UpdateSubcriptionRequest,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `subscription.controller updateSubscription: in: subscriptionId:${subscriptionId}, resource:${JSON.stringify(
                resource,
            )}`,
        );

        try {
            await this.subscriptionService.update({
                id: subscriptionId,
                ...resource,
            });
            res.status(204);
        } catch (e) {
            handleError(e, res);
        }

        logger.debug(`subscription.controller updateSubscription: exit:`);
    }

    @httpDelete('/users/:userId/subscriptions')
    public async deleteSubscriptionsForUser(
        @requestParam('userId') userId: string,
        @queryParam('principal') principal: string,
        @queryParam('principalValue') principalValue: string,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(
            `subscription.controller deleteSubscriptionsForUser: in: userId:${userId}, principal:${principal}, principalValue:${principalValue}`,
        );

        try {
            await this.subscriptionService.deleteByUser(userId, principal, principalValue);
        } catch (e) {
            handleError(e, res);
        }

        logger.debug(`subscription.controller deleteSubscriptionsForUser: exit:`);
    }

    @httpGet('/users/:userId/subscriptions')
    public async listSubscriptionsForUser(
        @requestParam('userId') userId: string,
        @queryParam('principal') principal: string,
        @queryParam('principalValue') principalValue: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<SubscriptionResourceList> {
        logger.debug(
            `subscription.controller listSubscriptionsForUser: in: userId:${userId}, principal:${principal}, principalValue:${principalValue}`,
        );

        let resources: SubscriptionResourceList;
        try {
            const items = await this.subscriptionService.listByUser(
                userId,
                false,
                principal,
                principalValue,
            );
            if (items === undefined) {
                res.status(404).end();
            }
            resources = this.subscriptionAssembler.toResourceList(items, req['version']);
        } catch (e) {
            handleError(e, res);
        }

        logger.debug(
            `subscription.controller listSubscriptionsForUser: exit: ${JSON.stringify(resources)}`,
        );
        return resources;
    }

    @httpGet('/events/:eventId/subscriptions')
    public async listSubscriptionsForEvent(
        @requestParam('eventId') eventId: string,
        @queryParam('fromSubscriptionId') fromSubscriptionId: string,
        @request() req: Request,
        @response() res: Response,
    ): Promise<SubscriptionResourceList> {
        logger.debug(
            `subscription.controller listSubscriptionsForEvent: in: eventId:${eventId}, fromSubscriptionId:${fromSubscriptionId}`,
        );

        let resources: SubscriptionResourceList;
        try {
            let from;
            if (fromSubscriptionId !== undefined && fromSubscriptionId.length > 0) {
                from = {
                    eventId,
                    subscriptionId: fromSubscriptionId,
                };
            }
            const [items, pagination] = await this.subscriptionService.listByEvent(eventId, from);

            if (items === undefined) {
                res.status(404).end();
            }

            resources = this.subscriptionAssembler.toResourceList(
                items,
                req['version'],
                pagination,
            );
        } catch (e) {
            handleError(e, res);
        }

        logger.debug(
            `subscription.controller listSubscriptionsForEvent: exit: ${JSON.stringify(
                resources,
            )}`,
        );
        return resources;
    }
}
