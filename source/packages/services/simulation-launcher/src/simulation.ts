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
import '@aws-solutions/cdf-config-inject';

import AWS = require('aws-sdk');
import { TaskOverride } from 'aws-sdk/clients/ecs';
import { logger } from './utils/logger';

export type SimulationTaskOverride = Pick<TaskOverride, 'taskRoleArn'>;

export interface LaunchParams {
    simulationId: string;
    instances: number;
    s3RootKey: string;
    taskOverrides?: SimulationTaskOverride;
}

interface InstanceParams {
    simulationId: string;
    instanceId: number;
    clusterId: string;
    s3Bucket: string;
    s3TestPlanKey: string;
    s3PropertiesKey: string;
    s3UploadKeyPrefix: string;
    subnetIds: string[];
    securityGroupId: string;
    taskOverrides: SimulationTaskOverride;
}

export class Simulation {
    private readonly _ecs: AWS.ECS;
    private readonly _bucket: string;
    private readonly _subnetId: string;
    private readonly _clusterId: string;
    private readonly _securityGroupId: string;
    private readonly _taskDefinitionArn: string;

    constructor(region: string) {
        this._ecs = new AWS.ECS({ region });
        this._bucket = process.env.AWS_S3_BUCKET;
        this._subnetId = process.env.AWS_ECS_SUBNETIDS;
        this._clusterId = process.env.AWS_ECS_CLUSTERID;
        this._securityGroupId = process.env.AWS_ECS_SECURITYGROUPID;
        this._taskDefinitionArn = process.env.AWS_ECS_TASKDEFINITIONARN;
    }

    public async launch(params: LaunchParams) {
        logger.info(`simulation.launch.ts: launch: params:${JSON.stringify(params)}`);

        const subnetIds = this._subnetId;
        const clusterId = this._clusterId;
        const securityGroupId = this._securityGroupId;

        const instanceParams: InstanceParams = {
            clusterId,
            simulationId: params.simulationId,
            instanceId: 1,
            s3Bucket: this._bucket,
            s3TestPlanKey: `${params.s3RootKey}plan.jmx`,
            s3PropertiesKey: `${params.s3RootKey}instances/1/properties`,
            s3UploadKeyPrefix: `${params.s3RootKey}instances/1/`,
            subnetIds: subnetIds.split(','),
            securityGroupId,
            taskOverrides: params.taskOverrides,
        };
        for (let i = 0; i < params.instances; i++) {
            await this.launchInstance(instanceParams);
            instanceParams.instanceId = instanceParams.instanceId + 1;
            instanceParams.s3PropertiesKey = `${params.s3RootKey}instances/${instanceParams.instanceId}/properties`;
        }
    }

    private async launchInstance(params: InstanceParams): Promise<AWS.ECS.Types.RunTaskResponse> {
        logger.debug(`launchInstance: in: params:${JSON.stringify(params)}`);

        const runTaskParams: AWS.ECS.Types.RunTaskRequest = {
            cluster: params.clusterId,
            taskDefinition: this._taskDefinitionArn.split('/')[1],
            overrides: {
                containerOverrides: [
                    {
                        name: 'jmeter',
                        environment: [
                            {
                                name: 'BUCKET',
                                value: params.s3Bucket,
                            },
                            {
                                name: 'EXTERNAL_PROPERTIES',
                                value: params.s3PropertiesKey,
                            },
                            {
                                name: 'TEST_PLAN',
                                value: params.s3TestPlanKey,
                            },
                            {
                                name: 'INSTANCE_ID',
                                value: params.instanceId.toString(),
                            },
                            {
                                name: 'UPLOAD_DIR',
                                value: params.s3UploadKeyPrefix,
                            },
                        ],
                    },
                ],
                taskRoleArn: params.taskOverrides?.taskRoleArn,
            },
            networkConfiguration: {
                awsvpcConfiguration: {
                    assignPublicIp: 'ENABLED',
                    securityGroups: [params.securityGroupId],
                    subnets: params.subnetIds,
                },
            },
            count: 1,
            startedBy: params.simulationId,
            launchType: 'FARGATE',
            // tags: [{
            //         key: 'cdf-simulation-id',
            //         value: params.simulationId
            //     }
            // ]
        };

        await this.sleep(100);

        const res = await this._ecs.runTask(runTaskParams).promise();
        logger.debug(`launchInstance: exit: ${JSON.stringify(res)}`);
        return res;
    }

    private async sleep(time: number): Promise<void> {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                logger.debug(`sleeping for: ${time}ms`);
                clearTimeout(timeout);
                resolve(undefined);
            }, time);
        }).then(() => {
            return;
        });
    }
}
