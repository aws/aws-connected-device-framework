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
import { CertificateBatchRequest, RequestHeaders } from './certificatestask.models';
import {CertificatesTaskService, CertificatesTaskServiceBase} from './certificatestask.service';

@injectable()
export class CertificatesTaskApigwService extends CertificatesTaskServiceBase implements CertificatesTaskService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('bulkcerts.baseUrl') as string;
    }

    async createCertificateTask(batchRequest:CertificateBatchRequest, caAlias:string, additionalHeaders?: RequestHeaders): Promise<string> {
        ow(caAlias, ow.string.nonEmpty);

            const url = `${this.baseUrl}${super.certificateTaskCreateRelativeUrl(caAlias)}`;
            const res = await request.post(url)
                .set(this.buildHeaders(additionalHeaders))
                .send(batchRequest);
        return res.body;
    }

}
