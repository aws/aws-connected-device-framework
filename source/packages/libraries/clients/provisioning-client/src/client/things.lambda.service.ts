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
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
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
export class ThingsLambdaService extends ThingsServiceBase implements ThingsService {
    private functionName: string;

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService,
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.PROVISIONING_API_FUNCTION_NAME;
    }

    /**
     * Provision Device
     *
     * @param provisioningRequest
     */
    public async provisionThing(
        provisioningRequest: ProvisionThingRequest,
        additionalHeaders?: RequestHeaders,
    ): Promise<ProvisionThingResponse> {
        ow(provisioningRequest.provisioningTemplateId, ow.string.nonEmpty);
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.thingsRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(provisioningRequest);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getThing(thingName: string, additionalHeaders?: RequestHeaders): Promise<Thing> {
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.thingRelativeUrl(thingName))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async deleteThing(
        thingName: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<void> {
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.thingRelativeUrl(thingName))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    public async bulkProvisionThings(
        req: BulkProvisionThingsRequest,
        additionalHeaders?: RequestHeaders,
    ): Promise<BulkProvisionThingsResponse> {
        ow(req, ow.object.nonEmpty);
        ow(req.provisioningTemplateId, ow.string.nonEmpty);
        ow(req.parameters, ow.array.nonEmpty.minLength(1));

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.bulkThingsRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(req);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getBulkProvisionTask(
        taskId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<BulkProvisionThingsResponse> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.bulkThingsTaskRelativeUrl(taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async updateThingCertificates(
        thingName: string,
        certificateStatus: CertificateStatus,
        additionalHeaders?: RequestHeaders,
    ): Promise<void> {
        ow(thingName, ow.string.nonEmpty);
        ow(certificateStatus, ow.string.nonEmpty);

        const body = {
            certificateStatus,
        };

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.thingCertificateRelativeUrl(thingName))
            .setMethod('PATCH')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(body);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
