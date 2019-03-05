/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

/* tslint:disable:no-unused-variable member-ordering */

import { ProvisionThingResponse, ProvisionThingRequest, Thing, BulkProvisionThingsRequest, BulkProvisionThingsResponse, CertificateStatus } from './things.model';
import { injectable } from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import { PathHelper } from '../utils/path.helper';

@injectable()
export class ThingsService {

    private MIME_TYPE:string = 'application/vnd.aws-cdf-v1.0+json';

    private baseUrl:string;
    private headers = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    public constructor() {
        this.baseUrl = config.get('provisioning.baseUrl') as string;
    }
    /**
     * Provision Device
     *
     * @param provisioningTemplateId Provisioning Template
     */
    public async provisionThing(provisioningRequest: ProvisionThingRequest ): Promise<ProvisionThingResponse> {
        ow(provisioningRequest.provisioningTemplateId, ow.string.nonEmpty);

        const res = await request.post(this.baseUrl + '/things')
            .set(this.headers)
            .send(provisioningRequest);

        return res.body;
    }

    public async getThing(thingName: string ): Promise<Thing> {
        ow(thingName, ow.string.nonEmpty);

        const url = `${this.baseUrl}/things/${PathHelper.encodeUrl(thingName)}`;
        const res = await request.get(url).set(this.headers);

        return res.body;
    }

    public async deleteThing(thingName: string ): Promise<void> {
        ow(thingName, ow.string.nonEmpty);

        const url = `${this.baseUrl}/things/${PathHelper.encodeUrl(thingName)}`;
        await request.delete(url).set(this.headers);
    }

    public async bulkProvisionThings(req: BulkProvisionThingsRequest ): Promise<BulkProvisionThingsResponse> {
        ow(req, ow.object.nonEmpty);
        ow(req.provisioningTemplateId, ow.string.nonEmpty);
        ow(req.parameters, ow.array.nonEmpty.minLength(1));

        const res = await request.post(`${this.baseUrl}/bulkthings`)
            .set(this.headers)
            .send(req);

        return res.body;
    }

    public async getBulkProvisionTask(taskId: string ): Promise<BulkProvisionThingsResponse> {
        ow(taskId, ow.string.nonEmpty);

        const url = `${this.baseUrl}/bulkthings/${PathHelper.encodeUrl(taskId)}`;
        const res = await request.get(url).set(this.headers);

        return res.body;
    }

    public async updateThingCertificates(thingName:string, certificateStatus:CertificateStatus): Promise<void> {
        ow(thingName, ow.string.nonEmpty);
        ow(certificateStatus, ow.string.nonEmpty);

        const url = `${this.baseUrl}/things/${PathHelper.encodeUrl(thingName)}/certificates`;
        const body = {
            certificateStatus
        };
       await request.patch(url)
            .set(this.headers)
            .send(body);
    }
}
