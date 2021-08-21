/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import ow from 'ow';
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
        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentTemplate, 'Deployment Template Information', ow.object.nonEmpty);
        ow(deployment.deploymentTemplate.type, 'Deployment Type', ow.string.nonEmpty)

        await this.deploymentStrategies[deployment.deploymentTemplate.type].create(deployment);
    }

    public async deploy(deployment: DeploymentModel): Promise<void> {
        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentTemplate, 'Deployment Template Information', ow.object.nonEmpty);
        ow(deployment.deploymentTemplate.type, 'Deployment Type', ow.string.nonEmpty)

        await this.deploymentStrategies[deployment.deploymentTemplate.type].deploy(deployment);
    }

    public async delete(deployment: DeploymentModel): Promise<void> {
        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentTemplate, 'Deployment Template Information', ow.object.nonEmpty);
        ow(deployment.deploymentTemplate.type, 'Deployment Type', ow.string.nonEmpty)

        await this.deploymentStrategies[deployment.deploymentTemplate.type].delete(deployment);
    }

    public async update(deployment: DeploymentModel): Promise<void>{
        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deployment.deploymentTemplate, 'Deployment Template Information', ow.object.nonEmpty);
        ow(deployment.deploymentTemplate.type, 'Deployment Type', ow.string.nonEmpty)

        await this.deploymentStrategies[deployment.deploymentTemplate.type].update(deployment);
    }

}
