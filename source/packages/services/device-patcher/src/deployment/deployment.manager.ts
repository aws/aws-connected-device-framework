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

import { DeploymentItem, DeploymentType } from './deployment.model';

import { AgentbasedDeploymentService } from './agentbased-deployment.service';


@injectable()
export class DeploymentManager {

    private readonly deploymentStrategies = {};

    constructor(
        @inject(TYPES.AgentbasedDeploymentService) protected agentbasedDeploymentService: AgentbasedDeploymentService
    ) {
        this.deploymentStrategies[DeploymentType.AGENTBASED] = agentbasedDeploymentService;
    }

    public async create(deploymentType:string, deployment: DeploymentItem): Promise<void> {
        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deploymentType, 'Deployment Template Type', ow.string.nonEmpty);

        await this.deploymentStrategies[deploymentType].create(deployment);
    }

    public async deploy(deploymentType:string, deployment: DeploymentItem): Promise<void> {
        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deploymentType, 'Deployment Template Type', ow.string.nonEmpty);

        await this.deploymentStrategies[deploymentType].deploy(deployment);
    }

    public async delete(deploymentType:string, deployment: DeploymentItem): Promise<void> {
        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deploymentType, 'Deployment Template Type', ow.string.nonEmpty);

        await this.deploymentStrategies[deploymentType].delete(deployment);
    }

    public async update(deploymentType:string, deployment: DeploymentItem): Promise<void>{
        ow(deployment, 'Deployment Information', ow.object.nonEmpty);
        ow(deploymentType, 'Deployment Template Type', ow.string.nonEmpty);

        await this.deploymentStrategies[deploymentType].update(deployment);
    }

}
