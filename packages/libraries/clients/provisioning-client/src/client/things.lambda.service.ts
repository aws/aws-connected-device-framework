/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

import ow from 'ow';
import { injectable, inject } from 'inversify';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';

import {
    ProvisionThingResponse,
    ProvisionThingRequest,
    Thing,
    BulkProvisionThingsRequest,
    BulkProvisionThingsResponse,
    CertificateStatus,
    RequestHeaders,
} from './things.model';

import {ThingsService, ThingsServiceBase} from './things.service';

@injectable()
export class ThingsLambdaService extends ThingsServiceBase implements ThingsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('provisioning.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    /**
     * Provision Device
     *
     * @param provisioningRequest
     */
    public async provisionThing(provisioningRequest: ProvisionThingRequest, additionalHeaders?:RequestHeaders): Promise<ProvisionThingResponse> {
        ow(provisioningRequest.provisioningTemplateId, ow.string.nonEmpty);
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.thingsRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(provisioningRequest);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getThing(thingName: string, additionalHeaders?:RequestHeaders ): Promise<Thing> {
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.thingRelativeUrl(thingName))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async deleteThing(thingName: string, additionalHeaders?:RequestHeaders ): Promise<void> {
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.thingRelativeUrl(thingName))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    public async bulkProvisionThings(req: BulkProvisionThingsRequest, additionalHeaders?:RequestHeaders): Promise<BulkProvisionThingsResponse> {
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

    public async getBulkProvisionTask(taskId: string, additionalHeaders?:RequestHeaders ): Promise<BulkProvisionThingsResponse> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.bulkThingsTaskRelativeUrl(taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async updateThingCertificates(thingName:string, certificateStatus:CertificateStatus, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(thingName, ow.string.nonEmpty);
        ow(certificateStatus, ow.string.nonEmpty);

        const body = {
            certificateStatus
        };

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.thingCertificateRelativeUrl(thingName))
            .setMethod('PATCH')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(body);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
