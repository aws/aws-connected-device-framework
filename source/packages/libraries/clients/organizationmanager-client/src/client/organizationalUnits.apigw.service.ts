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
import { RequestHeaders } from './common.model';
import { OrganizationalUnitResource } from './organizationalUnits.model';
import {
    OrganizationalUnitsService,
    OrganizationalUnitsServiceBase,
} from './organizationalUnits.service';

@injectable()
export class OrganizationalUnitsApigwService
    extends OrganizationalUnitsServiceBase
    implements OrganizationalUnitsService
{
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.ORGANIZATIONMANAGER_BASE_URL;
    }

    async createOrganizationalUnit(
        organizationalUnit: OrganizationalUnitResource,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(organizationalUnit, ow.object.nonEmpty);
        ow(organizationalUnit.name, ow.string.nonEmpty);

        return await request
            .post(`${this.baseUrl}${super.organizationalUnitsRelativeUrl()}`)
            .set(this.buildHeaders(additionalHeaders))
            .send(organizationalUnit)
            .use(await signClientRequest())
            .then((res) => {
                const location = res.get('Location');
                return location.substring(location.lastIndexOf('/') + 1);
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getOrganizationalUnit(
        organizationalUnitId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<OrganizationalUnitResource> {
        const url = `${this.baseUrl}${super.organizationalUnitRelativeUrl(organizationalUnitId)}`;
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

    async deleteOrganizationalUnit(
        organizationalUnitId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        const url = `${this.baseUrl}${super.organizationalUnitRelativeUrl(organizationalUnitId)}`;
        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listOrganizationalUnits(
        additionalHeaders?: RequestHeaders
    ): Promise<OrganizationalUnitResource[]> {
        return await request
            .get(`${this.baseUrl}${super.organizationalUnitsRelativeUrl()}`)
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
