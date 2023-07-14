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
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { ListrTask } from 'listr2';
import ow from 'ow';
import path from 'path';
import { Answers } from '../../../models/answers';
import { InfrastructureModule, ModuleName } from '../../../models/modules';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';
import {
    deleteStack,
    packageAndDeployStack,
    packageAndUploadTemplate,
} from '../../../utils/cloudformation.util';

const templateFileIn = 'infrastructure/cfn-deployment-helper.yaml';
const vpcTemplateFileIn = 'infrastructure/cfn-deployment-helper-vpc.yaml';

export class DeploymentHelperInstaller implements InfrastructureModule {
    public readonly friendlyName = 'Deployment Helper';
    public readonly name = 'deploymentHelper';
    public readonly dependsOnMandatory: ModuleName[] = [];
    public readonly dependsOnOptional: ModuleName[] = ['vpc'];
    public readonly type = 'INFRASTRUCTURE';

    private readonly vpcDeploymentHelperStackName: string;
    private readonly deploymentHelperStackName: string;

    constructor(environment: string) {
        this.vpcDeploymentHelperStackName = `cdf-deployment-helper-vpc-${environment}`;
        this.deploymentHelperStackName = `cdf-deployment-helper-${environment}`;
    }

    public async prompts(answers: Answers): Promise<Answers> {
        if (answers.deploymentHelper === undefined) {
            answers.deploymentHelper = {};
        }
        answers.deploymentHelper.deploy = true;
        return answers;
    }

    private getParameterOverrides(answers: Answers): string[] {
        const parameterOverrides = [
            `Environment=${answers.environment}`,
            `ArtifactsBucket=${answers.s3.bucket}`,
            `VpcId=${answers.vpc?.id ?? 'N/A'}`,
            `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? 'N/A'}`,
            `PrivateSubnetIds=${answers.vpc?.privateSubnetIds ?? 'N/A'}`,
        ];
        return parameterOverrides;
    }

    public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
        const monorepoRoot = await getMonorepoRoot();
        const tasks: ListrTask[] = [
            {
                title: `Packaging '${this.name} [Default Deployment Helper]'`,
                task: async () => {
                    await packageAndUploadTemplate({
                        answers: answers,
                        templateFile: templateFileIn,
                        serviceName: 'deployment-helper',
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'libraries',
                            'core',
                            'deployment-helper',
                        ),
                        parameterOverrides: [
                            `Environment=${answers.environment}`,
                            `ArtifactsBucket=${answers.s3.bucket}`,
                        ],
                    });
                },
            },
            {
                title: `Packaging '${this.name} [VPC Deployment Helper]'`,
                task: async () => {
                    await packageAndUploadTemplate({
                        answers: answers,
                        serviceName: 'deployment-helper',
                        templateFile: vpcTemplateFileIn,
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'libraries',
                            'core',
                            'deployment-helper',
                        ),
                        parameterOverrides: this.getParameterOverrides(answers),
                    });
                },
            },
        ];
        return [answers, tasks];
    }

    public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {
        ow(answers, ow.object.plain);
        ow(answers.environment, ow.string.nonEmpty);
        ow(answers.region, ow.string.nonEmpty);

        if (answers.deploymentHelper?.deploy) {
            ow(answers.s3.bucket, ow.string.nonEmpty);
        }

        const tasks: ListrTask[] = [];
        const skipVpcDeploymentHelper = answers.vpc?.id === undefined;
        const monorepoRoot = await getMonorepoRoot();

        if (answers.deploymentHelper?.deploy) {
            tasks.push({
                title: `Packaging and deploying stack '${this.deploymentHelperStackName}'`,
                task: async () => {
                    await packageAndDeployStack({
                        answers: answers,
                        stackName: this.deploymentHelperStackName,
                        serviceName: 'deployment-helper',
                        templateFile: templateFileIn,
                        parameterOverrides: [
                            `Environment=${answers.environment}`,
                            `ArtifactsBucket=${answers.s3.bucket}`,
                        ],
                        needsPackaging: true,
                        needsCapabilityNamedIAM: true,
                        needsCapabilityAutoExpand: false,
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'libraries',
                            'core',
                            'deployment-helper',
                        ),
                    });
                },
            });

            tasks.push({
                title: `Packaging and deploying stack '${this.vpcDeploymentHelperStackName}'`,
                skip: skipVpcDeploymentHelper,
                task: async () => {
                    await packageAndDeployStack({
                        answers: answers,
                        stackName: this.vpcDeploymentHelperStackName,
                        serviceName: 'deployment-helper',
                        templateFile: vpcTemplateFileIn,
                        parameterOverrides: this.getParameterOverrides(answers),
                        needsPackaging: true,
                        needsCapabilityNamedIAM: true,
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'libraries',
                            'core',
                            'deployment-helper',
                        ),
                    });
                },
            });
        }

        tasks.push({
            title: `Retrieving config from stack '${this.deploymentHelperStackName}'`,
            task: async () => {
                const cloudFormation = new CloudFormationClient({ region: answers.region });
                const r = await cloudFormation.send(
                    new DescribeStacksCommand({
                        StackName: this.deploymentHelperStackName,
                    }),
                );
                answers.deploymentHelper.lambdaArn = r?.Stacks?.[0]?.Outputs?.find(
                    (o) => o.OutputKey === 'CustomResourceLambdaArn',
                )?.OutputValue;
            },
        });

        tasks.push({
            title: `Retrieving config from stack '${this.vpcDeploymentHelperStackName}'`,
            skip: skipVpcDeploymentHelper,
            task: async () => {
                const cloudFormation = new CloudFormationClient({ region: answers.region });
                const r = await cloudFormation.send(
                    new DescribeStacksCommand({
                        StackName: this.vpcDeploymentHelperStackName,
                    }),
                );
                answers.deploymentHelper.vpcLambdaArn = r?.Stacks?.[0]?.Outputs?.find(
                    (o) => o.OutputKey === 'CustomResourceVpcLambdaArn',
                )?.OutputValue;
            },
        });

        return [answers, tasks];
    }

    public async delete(answers: Answers): Promise<ListrTask[]> {
        const tasks: ListrTask[] = [];
        tasks.push({
            title: `Deleting stack deploymentHelper`,
            task: async () => {
                await deleteStack(this.deploymentHelperStackName, answers.region);
                await deleteStack(this.vpcDeploymentHelperStackName, answers.region);
            },
        });
        return tasks;
    }
}
