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
import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';

import { QSHelper } from '../utils/qs.helper';
import {
    Category,
    CategoryEventsRequest,
    Events,
    ObjectEventsRequest,
    RequestHeaders,
} from './events.model';
import { EventsService, EventsServiceBase } from './events.service';

@injectable()
export class EventsApigwService extends EventsServiceBase implements EventsService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.ASSETLIBRARYHISTORY_BASE_URL;
    }

    async listObjectEvents(
        req: ObjectEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events> {
        ow(req, ow.object.nonEmpty);
        ow(req.category, ow.string.nonEmpty);
        ow(req.objectId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.objectEventsRelativeUrl(req.category, req.objectId)}`;
        const queryString = QSHelper.getQueryString(req);
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listDeviceEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events> {
        return this.listCategoryEvents(Category.devices, req, additionalHeaders);
    }

    async listGroupEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events> {
        return this.listCategoryEvents(Category.groups, req, additionalHeaders);
    }

    async listDeviceTemplateEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events> {
        return this.listCategoryEvents(Category.deviceTemplates, req, additionalHeaders);
    }

    async listGroupTemplateEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events> {
        return this.listCategoryEvents(Category.groupTemplates, req, additionalHeaders);
    }

    async listPolicyEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events> {
        return this.listCategoryEvents(Category.policies, req, additionalHeaders);
    }

    async listCategoryEvents(
        category: Category,
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events> {
        ow(category, 'category', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.eventsRelativeUrl(category)}`;
        const queryString = QSHelper.getQueryString(req);
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
