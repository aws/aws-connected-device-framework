/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {Category, CategoryEventsRequest, Events, ObjectEventsRequest, RequestHeaders} from './events.model';
import {EventsService, EventsServiceBase} from './events.service';
import {
    Dictionary,
    LambdaApiGatewayEventBuilder,
    LAMBDAINVOKE_TYPES,
    LambdaInvokerService,
} from '@cdf/lambda-invoke';

@injectable()
export class EventsLambdaService extends EventsServiceBase implements EventsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('assetLibraryHistory.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async listObjectEvents(req: ObjectEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events> {
        ow(req, ow.object.nonEmpty);
        ow(req.category, ow.string.nonEmpty);
        ow(req.objectId, ow.string.nonEmpty);

        // lambda querystring needs everything as strings...
        const qs:Dictionary = {};
        for(const property in req) {
            if (req.hasOwnProperty(property)) {
                qs[property] = `${req[property]}`;
            }
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.objectEventsRelativeUrl(req.category, req.objectId))
            .setMethod('GET')
            .setQueryStringParameters(qs)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;

    }

    async listDeviceEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events> {
        return this.listCategoryEvents(Category.devices, req, additionalHeaders);
    }

    async listGroupEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events> {
        return this.listCategoryEvents(Category.groups, req, additionalHeaders);
    }

    async listDeviceTemplateEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events> {
        return this.listCategoryEvents(Category.deviceTemplates, req, additionalHeaders);
    }

    async listGroupTemplateEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events> {
        return this.listCategoryEvents(Category.groupTemplates, req, additionalHeaders);
    }

    async listPolicyEvents(req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events> {
        return this.listCategoryEvents(Category.policies, req, additionalHeaders);
    }

    async listCategoryEvents(category: Category, req: CategoryEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events> {
        ow(category, ow.string.nonEmpty);

        // lambda querystring needs everything as strings...
        const qs:Dictionary = {};
        for(const property in req) {
            if (req.hasOwnProperty(property)) {
                qs[property] = `${req[property]}`;
            }
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.eventsRelativeUrl(category))
            .setMethod('GET')
            .setQueryStringParameters(qs)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;

    }
}
