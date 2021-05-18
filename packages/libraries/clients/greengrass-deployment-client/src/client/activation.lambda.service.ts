/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import ow from 'ow';
import { injectable, inject } from 'inversify';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';

import {ActivationService, ActivationServiceBase} from './activation.service';
import {ActivationResponse} from './activation.model';
import {RequestHeaders} from './common.model';


@injectable()
export class ActivationLambdaService extends ActivationServiceBase implements ActivationService {
    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('greengrassDeployment.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    public async createActivation(deviceId: string, additionalHeaders?:RequestHeaders): Promise<ActivationResponse> {
        ow(deviceId, ow.string.nonEmpty);

        const requestBody = {
            deviceId
        }

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.activationsRelativeUrl(deviceId))
            .setPath('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(requestBody)

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async getActivation(activationId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<ActivationResponse> {
        ow(deviceId, ow.string.nonEmpty);
        ow(activationId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.activationsByIdRelativeUrl(activationId, deviceId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    public async deleteActivation(activationId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(deviceId, ow.string.nonEmpty);
        ow(activationId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.activationsByIdRelativeUrl(activationId, deviceId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
