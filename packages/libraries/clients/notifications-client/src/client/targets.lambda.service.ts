/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {RequestHeaders} from './common.model';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';
import { TargetsService, TargetsServiceBase } from './targets.service';
import { TargetResource } from './targets.model';

@injectable()
export class TargetsLambdaService extends TargetsServiceBase implements TargetsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('notifications.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createTarget(subscriptionId: string, targetType:string, target: TargetResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(target, ow.object.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.targetsRelativeUrl(subscriptionId, targetType))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(target);

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

    async deleteTarget(subscriptionId: string, targetType:string, targetId:string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(targetId, ow.string.nonEmpty);

        const ev = new LambdaApiGatewayEventBuilder()
            .setPath(super.targetRelativeUrl(subscriptionId, targetType, targetId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, ev);
    }

}
