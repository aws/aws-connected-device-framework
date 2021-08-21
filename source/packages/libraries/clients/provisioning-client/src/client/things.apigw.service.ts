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
import {
    BulkProvisionThingsRequest,
    BulkProvisionThingsResponse,
    CertificateStatus,
    ProvisionThingRequest,
    ProvisionThingResponse, RequestHeaders,
    Thing,
} from './things.model';

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {ThingsService, ThingsServiceBase} from './things.service';

@injectable()
export class ThingsApigwService extends ThingsServiceBase implements ThingsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('provisioning.baseUrl') as string;
    }

    /**
     * Provision Device
     *
     * @param provisioningTemplateId Provisioning Template
     */
    async provisionThing(provisioningRequest: ProvisionThingRequest, additionalHeaders?:RequestHeaders): Promise<ProvisionThingResponse> {
        ow(provisioningRequest.provisioningTemplateId, ow.string.nonEmpty);

        const res = await request.post(`${this.baseUrl}${super.thingsRelativeUrl()}`)
            .set(super.buildHeaders(additionalHeaders))
            .send(provisioningRequest);

        return res.body;
    }

    async getThing(thingName: string, additionalHeaders?:RequestHeaders): Promise<Thing> {
        ow(thingName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.thingRelativeUrl(thingName)}`;
        const res = await request.get(url).set(super.buildHeaders(additionalHeaders));

        return res.body;
    }

    async deleteThing(thingName: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(thingName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.thingRelativeUrl(thingName)}`;
        await request.delete(url).set(super.buildHeaders(additionalHeaders));
    }

    async bulkProvisionThings(req: BulkProvisionThingsRequest, additionalHeaders?:RequestHeaders): Promise<BulkProvisionThingsResponse> {
        ow(req, ow.object.nonEmpty);
        ow(req.provisioningTemplateId, ow.string.nonEmpty);
        ow(req.parameters, ow.array.nonEmpty.minLength(1));

        const res = await request.post(`${this.baseUrl}${super.bulkThingsRelativeUrl()}`)
            .set(super.buildHeaders(additionalHeaders))
            .send(req);

        return res.body;
    }

    async getBulkProvisionTask(taskId: string, additionalHeaders?:RequestHeaders): Promise<BulkProvisionThingsResponse> {
        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.bulkThingsTaskRelativeUrl(taskId)}`;
        const res = await request.get(url).set(super.buildHeaders(additionalHeaders));

        return res.body;
    }

    async updateThingCertificates(thingName: string, certificateStatus: CertificateStatus, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(thingName, ow.string.nonEmpty);
        ow(certificateStatus, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.thingCertificateRelativeUrl(thingName)}`;
        const body = {
            certificateStatus,
        };
        await request.patch(url)
            .set(super.buildHeaders(additionalHeaders))
            .send(body);
    }
}
