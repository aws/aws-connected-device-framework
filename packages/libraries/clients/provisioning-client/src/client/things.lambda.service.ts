/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

/* tslint:disable:no-unused-variable member-ordering */
import ow from 'ow';
import { injectable, inject } from 'inversify';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder, LambdaApiGatewayEventMethodTypes } from '@cdf/lambda-invoke';

import { ProvisionThingResponse, ProvisionThingRequest, Thing, BulkProvisionThingsRequest, BulkProvisionThingsResponse, CertificateStatus } from './things.model';

import { PathHelper } from '../utils/path.helper';
import { ThingsService } from './things.service';

@injectable()
export class ThingsServiceLambda implements ThingsService {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('provisioning.apifunctionname') private functionName : string
    ) {
        this.lambdaInvoker = lambdaInvoker;
    }

    /**
     * Provision Device
     *
     * @param provisioningRequest
     */
    public async provisionThing(provisioningRequest: ProvisionThingRequest): Promise<ProvisionThingResponse> {
        ow(provisioningRequest.provisioningTemplateId, ow.string.nonEmpty);
        const event = new LambdaApiGatewayEventBuilder()
                .setPath('/things')
                .setMethod(LambdaApiGatewayEventMethodTypes.POST)
                .setHeaders(this.headers)
                .setBody(provisioningRequest);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getThing(thingName: string ): Promise<Thing> {
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(`/things/${PathHelper.encodeUrl(thingName)}`)
            .setMethod(LambdaApiGatewayEventMethodTypes.GET)
            .setHeaders(this.headers);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async deleteThing(thingName: string ): Promise<void> {
        ow(thingName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(`/things/${PathHelper.encodeUrl(thingName)}`)
            .setMethod(LambdaApiGatewayEventMethodTypes.DELETE)
            .setHeaders(this.headers);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    public async bulkProvisionThings(req: BulkProvisionThingsRequest): Promise<BulkProvisionThingsResponse> {
        ow(req, ow.object.nonEmpty);
        ow(req.provisioningTemplateId, ow.string.nonEmpty);
        ow(req.parameters, ow.array.nonEmpty.minLength(1));

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(`/bulkthings`)
            .setMethod(LambdaApiGatewayEventMethodTypes.POST)
            .setHeaders(this.headers)
            .setBody(req);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getBulkProvisionTask(taskId: string ): Promise<BulkProvisionThingsResponse> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(`/bulkthings/${PathHelper.encodeUrl(taskId)}`)
            .setMethod(LambdaApiGatewayEventMethodTypes.GET)
            .setHeaders(this.headers);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async updateThingCertificates(thingName:string, certificateStatus:CertificateStatus): Promise<void> {
        ow(thingName, ow.string.nonEmpty);
        ow(certificateStatus, ow.string.nonEmpty);

        const body = {
            certificateStatus
        };

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(`/things/${PathHelper.encodeUrl(thingName)}/certificates`)
            .setMethod(LambdaApiGatewayEventMethodTypes.PATCH)
            .setHeaders(this.headers)
            .setBody(body);

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
