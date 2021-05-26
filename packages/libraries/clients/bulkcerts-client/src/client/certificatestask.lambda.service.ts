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

import {injectable, inject} from 'inversify';
import ow from 'ow';
import { CertificateBatchRequest, CertificateBatchTask, RequestHeaders } from './certificatestask.models';
import {CertificatesTaskService, CertificatesTaskServiceBase} from './certificatestask.service';
import {LAMBDAINVOKE_TYPES, LambdaInvokerService, LambdaApiGatewayEventBuilder} from '@cdf/lambda-invoke';

@injectable()
export class CertificatesTaskLambdaService extends CertificatesTaskServiceBase implements CertificatesTaskService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('bulkcerts.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createCertificateTask(batchRequest:CertificateBatchRequest,caAlias:string, additionalHeaders?: RequestHeaders): Promise<CertificateBatchTask> {
        ow(caAlias, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.certificateTaskCreateRelativeUrl(caAlias))
            .setMethod('POST')
            .setBody(batchRequest)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
