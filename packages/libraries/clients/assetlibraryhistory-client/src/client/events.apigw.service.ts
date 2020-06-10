/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

/* tslint:disable:no-unused-variable member-ordering */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {Category, CategoryEventsRequest, Events, ObjectEventsRequest, RequestHeaders} from './events.model';
import {QSHelper} from '../utils/qs.helper';
import {EventsService, EventsServiceBase} from './events.service';

@injectable()
export class EventsApigwService extends EventsServiceBase implements EventsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('assetLibraryHistory.baseUrl') as string;
    }

    async listObjectEvents(req: ObjectEventsRequest, additionalHeaders?: RequestHeaders): Promise<Events> {
        ow(req, ow.object.nonEmpty);
        ow(req.category, ow.string.nonEmpty);
        ow(req.objectId, ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.objectEventsRelativeUrl(req.category, req.objectId)}`;
        const queryString = QSHelper.getQueryString(req);
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

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

        let url = `${this.baseUrl}${super.eventsRelativeUrl(category)}`;
        const queryString = QSHelper.getQueryString(req);
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;

    }

}
