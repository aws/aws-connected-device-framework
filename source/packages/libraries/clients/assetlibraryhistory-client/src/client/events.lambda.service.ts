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

    private functionName : string;
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.ASSETLIBRARYHISTORY_API_FUNCTION_NAME;
    }

    async listObjectEvents(req: ObjectEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events> {
        ow(req, ow.object.nonEmpty);
        ow(req.category, ow.string.nonEmpty);
        ow(req.objectId, ow.string.nonEmpty);

        // lambda querystring needs everything as strings...
        const qs:Dictionary = {};
        for(const property in req) {
            if (Object.prototype.hasOwnProperty.call(req,property)) {
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
        ow(category,'category', ow.string.nonEmpty);

        // lambda querystring needs everything as strings...
        const qs:Dictionary = {};
        for(const property in req) {
            if (Object.prototype.hasOwnProperty.call(req,property)) {
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
