/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {RequestHeaders} from './common.model';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';
import { MessagesDebugService, MessagesDebugServiceBase } from './messages.service';
import { SimulateIoTCoreMessageRequest } from './messages.model';

@injectable()
export class MessagesDebugLambdaService extends MessagesDebugServiceBase implements MessagesDebugService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('notifications.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async simulateIoTCoreMessage(message:SimulateIoTCoreMessageRequest, additionalHeaders?: RequestHeaders
        ): Promise<void> {
            ow(message, ow.object.nonEmpty);
            ow(message.topic, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.iotcoreRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(message);

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

}
