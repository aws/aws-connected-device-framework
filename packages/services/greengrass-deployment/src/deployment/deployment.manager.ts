/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { inject, injectable } from 'inversify';

import {TYPES} from '../di/types';

import { DeploymentModel, DeploymentType } from './deployment.model';

import { AgentbasedDeploymentService } from './agentbased-deployment.service';
import { AgentlessDeploymentService } from './agentless-deployment.service';

@injectable()
export class DeploymentManager {

    private readonly deploymentStrategies = {};

    constructor(
        @inject(TYPES.AgentlessDeploymentService) protected agentlessDeploymentService: AgentlessDeploymentService,
        @inject(TYPES.AgentbasedDeploymentService) protected agentbasedDeploymentService: AgentbasedDeploymentService
    ) {
        this.deploymentStrategies[DeploymentType.AGENTBASED] = agentbasedDeploymentService;
        this.deploymentStrategies[DeploymentType.AGENTLESS] = agentlessDeploymentService;
    }

    public async create(deployment: DeploymentModel): Promise<void> {
        await this.deploymentStrategies[deployment.deploymentTemplate.type].create(deployment);
    }

    public async deploy(deployment: DeploymentModel): Promise<void> {
        await this.deploymentStrategies[deployment.deploymentTemplate.type].deploy(deployment);
    }

    public async delete(deployment: DeploymentModel): Promise<void> {
        await this.deploymentStrategies[deployment.deploymentTemplate.type].delete(deployment);
    }

}
