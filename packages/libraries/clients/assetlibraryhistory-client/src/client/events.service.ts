/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Asset Library implementation of DevicesService *
 */

/* tslint:disable:no-unused-variable member-ordering */

import { injectable } from 'inversify';
import ow from 'ow';
import { PathHelper } from '../utils/path.helper';
import * as request from 'superagent';
import config from 'config';
import { CategoryEventsRequest, Events, Category, ObjectEventsRequest } from './events.model';
import { QSHelper } from '../utils/qs.helper';

@injectable()
export class EventsService  {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    public constructor() {
        this.baseUrl = config.get('assetLibraryHistory.baseUrl') as string;
    }

    public async listObjectEvents(req:ObjectEventsRequest) : Promise<Events> {
        ow(req, ow.object.nonEmpty);
        ow(req.category, ow.string.nonEmpty);
        ow(req.objectId, ow.string.nonEmpty);

        let url = this.baseUrl + PathHelper.encodeUrl(req.category, req.objectId);
        const queryString = QSHelper.getQueryString(req);
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
        .set(this.headers);

        return res.body;

    }

    public async listDeviceEvents(req:CategoryEventsRequest) : Promise<Events> {
        return this.listCategoryEvents(Category.devices, req);
    }

    public async listGroupEvents(req:CategoryEventsRequest) : Promise<Events> {
        return this.listCategoryEvents(Category.groups, req);
    }

    public async listDeviceTemplateEvents(req:CategoryEventsRequest) : Promise<Events> {
        return this.listCategoryEvents(Category.deviceTemplates, req);
    }

    public async listGroupTemplateEvents(req:CategoryEventsRequest) : Promise<Events> {
        return this.listCategoryEvents(Category.groupTemplates, req);
    }

    public async listPolicyEvents(req:CategoryEventsRequest) : Promise<Events> {
        return this.listCategoryEvents(Category.policies, req);
    }

    private async listCategoryEvents(category:Category, req:CategoryEventsRequest) : Promise<Events> {
        ow(category, ow.string.nonEmpty);

        let url = `${this.baseUrl}/${category}`;
        const queryString = QSHelper.getQueryString(req);
        if (queryString) {
            url += `?${queryString}`;
        }

        const res = await request.get(url)
        .set(this.headers);

        return res.body;

    }

}
