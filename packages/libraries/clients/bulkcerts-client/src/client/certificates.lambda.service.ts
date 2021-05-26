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
import { RequestHeaders ,CertificateBatchTaskWithChunks } from './certificates.models';
import {CertificatesService, CertificatesServiceBase} from './certificates.service';
import {LAMBDAINVOKE_TYPES, LambdaInvokerService, LambdaApiGatewayEventBuilder} from '@cdf/lambda-invoke';

@injectable()
export class CertificatesLambdaService extends CertificatesServiceBase implements CertificatesService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('bulkcerts.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async getCertificates(taskId:string, downloadType:string, additionalHeaders?: RequestHeaders): Promise<string[]|Buffer> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(`${super.getCertificatesRelativeUrl(taskId)}`)
            .setQueryStringParameters({'downloadType':downloadType})
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getCertificatesTask(taskId:string, additionalHeaders?: RequestHeaders): Promise<CertificateBatchTaskWithChunks> {
        ow(taskId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.getCertificatesTaskRelativeUrl(taskId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
