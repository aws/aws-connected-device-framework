/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import {inject, injectable} from 'inversify';
import ow from 'ow';
import {RequestHeaders} from './common.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { DeploymentsServiceBase, DeploymentsService } from './deployments.service';
import { Deployment, DeploymentTaskSummary } from './deployments.model';

@injectable()
export class DeploymentsLambdaService extends DeploymentsServiceBase implements DeploymentsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('greengrassProvisioning.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createDeploymentTask(deployments:Deployment[], additionalHeaders?:RequestHeaders) : Promise<DeploymentTaskSummary> {

        ow(deployments, ow.array.minLength(1));

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentsRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody({deployments});

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getDeploymentTask(deploymentId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentTaskSummary> {
        ow(deploymentId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.deploymentsByIdRelativeUrl(deploymentId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

}
