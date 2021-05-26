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
import ow from 'ow';
import * as request from 'superagent';
import config from 'config';
import { RequestHeaders, CertificateBatchTaskWithChunks} from './certificates.models';
import {CertificatesService, CertificatesServiceBase} from './certificates.service';

@injectable()
export class CertificatesApigwService extends CertificatesServiceBase implements CertificatesService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('bulkcerts.baseUrl') as string;
    }

    async getCertificates(taskId:string, downloadType:string, additionalHeaders?: RequestHeaders): Promise<string[]|Buffer> {
        ow(taskId, ow.string.nonEmpty);

        const res = await request.get(`${this.baseUrl}${super.getCertificatesRelativeUrl(taskId)}?downloadType=${downloadType}`)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getCertificatesTask(taskId:string, additionalHeaders?: RequestHeaders): Promise<CertificateBatchTaskWithChunks> {
        ow(taskId, ow.string.nonEmpty);

        const res = await request.get(`${this.baseUrl}${super.getCertificatesTaskRelativeUrl(taskId)}`)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }
}
