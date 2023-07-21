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

/* tslint:disable:no-unused-variable member-ordering */
import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import * as request from 'superagent';
import { BulkComponentsService, BulkComponentsServiceBase } from './bulkComponents.service';
import { RequestHeaders } from './common.model';
import {
    BulkComponentsResource,
    BulkComponentsResult,
    ComponentResource,
} from './components.model';

@injectable()
export class BulkComponentsApigwService
    extends BulkComponentsServiceBase
    implements BulkComponentsService
{
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.ORGANIZATIONMANAGER_BASE_URL;
    }

    async bulkCreateComponents(
        organizationalUnitId: string,
        bulkComponentsResource: BulkComponentsResource,
        additionalHeaders?: RequestHeaders
    ): Promise<BulkComponentsResult> {
        ow(bulkComponentsResource, ow.object.nonEmpty);
        ow(organizationalUnitId, ow.string.nonEmpty);
        return await request
            .post(`${this.baseUrl}${super.componentsRelativeUrl(organizationalUnitId)}`)
            .set(this.buildHeaders(additionalHeaders))
            .send(bulkComponentsResource)
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async bulkGetComponents(
        organizationalUnitId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ComponentResource[]> {
        const url = `${this.baseUrl}${super.componentsRelativeUrl(organizationalUnitId)}`;
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

    async bulkDeleteComponents(
        organizationalUnitId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        return await request
            .delete(`${this.baseUrl}${super.componentsRelativeUrl(organizationalUnitId)}`)
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
