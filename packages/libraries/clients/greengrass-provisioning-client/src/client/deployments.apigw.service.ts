/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/* tslint:disable:no-unused-variable member-ordering */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { DeploymentsServiceBase, DeploymentsService } from './deployments.service';
import { Deployment, DeploymentTaskSummary } from './deployments.model';

@injectable()
export class DeploymentsApigwService extends DeploymentsServiceBase implements DeploymentsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassProvisioning.baseUrl') as string;
    }

    async createDeploymentTask(deployments:Deployment[], additionalHeaders?:RequestHeaders) : Promise<DeploymentTaskSummary> {
        ow(deployments, ow.array.minLength(1));

        const url = `${this.baseUrl}${super.deploymentsRelativeUrl()}`;
        const body = {
            deployments
        };
        const res = await request.post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getDeploymentTask(deploymentId: string, additionalHeaders?:RequestHeaders): Promise<DeploymentTaskSummary> {
        ow(deploymentId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.deploymentsByIdRelativeUrl(deploymentId)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }
}
