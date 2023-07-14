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
import {
    BulkProvisionThingsRequest,
    BulkProvisionThingsResponse,
    CertificateStatus,
    ProvisionThingRequest,
    ProvisionThingResponse,
    RequestHeaders,
    Thing,
} from './things.model';
import { ThingsService, ThingsServiceBase } from './things.service';

@injectable()
export class ThingsApigwService extends ThingsServiceBase implements ThingsService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.PROVISIONING_BASE_URL;
    }

    /**
     * Provision Device
     *
     * @param provisioningTemplateId Provisioning Template
     */
    async provisionThing(
        provisioningRequest: ProvisionThingRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<ProvisionThingResponse> {
        ow(provisioningRequest.provisioningTemplateId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.thingsRelativeUrl()}`;
        return await request
            .post(url)
            .send(provisioningRequest)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getThing(thingName: string, additionalHeaders?: RequestHeaders): Promise<Thing> {
        ow(thingName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.thingRelativeUrl(thingName)}`;
        return await request
            .get(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteThing(thingName: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(thingName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.thingRelativeUrl(thingName)}`;
        return await request
            .delete(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async bulkProvisionThings(
        req: BulkProvisionThingsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<BulkProvisionThingsResponse> {
        ow(req, ow.object.nonEmpty);
        ow(req.provisioningTemplateId, ow.string.nonEmpty);
        ow(req.parameters, ow.array.nonEmpty.minLength(1));

        const url = `${this.baseUrl}${super.bulkThingsRelativeUrl()}`;
        return await request
            .post(url)
            .send(req)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getBulkProvisionTask(
        taskId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<BulkProvisionThingsResponse> {
        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.bulkThingsTaskRelativeUrl(taskId)}`;
        return await request
            .get(url)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async updateThingCertificates(
        thingName: string,
        certificateStatus: CertificateStatus,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(thingName, ow.string.nonEmpty);
        ow(certificateStatus, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.thingCertificateRelativeUrl(thingName)}`;
        const body = {
            certificateStatus,
        };
        return await request
            .patch(url)
            .send(body)
            .set(super.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
