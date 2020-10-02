/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { MessagesDebugService, MessagesDebugServiceBase } from './messages.service';
import { SimulateIoTCoreMessageRequest } from './messages.model';

@injectable()
export class MessagesDebugApigwService extends MessagesDebugServiceBase implements MessagesDebugService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('notifications.baseUrl') as string;
    }

    async simulateIoTCoreMessage(message:SimulateIoTCoreMessageRequest, additionalHeaders?: RequestHeaders
        ): Promise<void> {

        ow(message, ow.object.nonEmpty);
        ow(message.topic, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.iotcoreRelativeUrl()}`;
        await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(message);
    }

}
