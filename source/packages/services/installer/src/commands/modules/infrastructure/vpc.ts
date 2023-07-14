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
import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';
import path from 'path';
import { Answers } from '../../../models/answers';
import { InfrastructureModule, ModuleName } from '../../../models/modules';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';
import {
    deleteStack,
    getStackOutputs,
    packageAndDeployStack,
    packageAndUploadTemplate,
} from '../../../utils/cloudformation.util';

export class VpcInstaller implements InfrastructureModule {
    public readonly friendlyName = 'VPC';
    public readonly name = 'vpc';
    public readonly dependsOnMandatory: ModuleName[] = [];
    public readonly dependsOnOptional: ModuleName[] = [];
    public readonly type = 'INFRASTRUCTURE';

    private stackName: string;

    constructor(environment: string) {
        this.stackName = `cdf-network-${environment}`;
    }

    public async prompts(answers: Answers): Promise<Answers> {
        delete answers.vpc?.useExisting;

        answers = await inquirer.prompt(
            [
                {
                    message:
                        'Some of the modules selected may require a VPC. Use an existing VPC for these? If not, a new VPC will be created.',
                    type: 'confirm',
                    name: 'vpc.useExisting',
                    default: answers.vpc?.useExisting ?? false,
                },
                {
                    message: 'Enter existing VPC id:',
                    type: 'input',
                    name: 'vpc.id',
                    default: answers.vpc?.id,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.vpc?.useExisting ?? false;
                    },
                },
                {
                    message: 'Enter existing security group id:',
                    type: 'input',
                    name: 'vpc.securityGroupId',
                    default: answers.vpc?.securityGroupId,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.vpc?.useExisting ?? false;
                    },
                },
                {
                    message: 'Enter existing private subnet ids (separated with a comma):',
                    type: 'input',
                    name: 'vpc.privateSubnetIds',
                    default: answers.vpc?.privateSubnetIds,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.vpc?.useExisting ?? false;
                    },
                },
                {
                    message: 'Enter existing private API Gateway VPC endpoint:',
                    type: 'input',
                    name: 'vpc.privateApiGatewayVpcEndpoint',
                    default: answers.vpc?.privateApiGatewayVpcEndpoint,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.vpc?.useExisting ?? false;
                    },
                },
            ],
            answers
        );

        if ((answers.vpc?.useExisting ?? false) === false) {
            delete answers.vpc?.id;
            delete answers.vpc?.securityGroupId;
            delete answers.vpc?.privateSubnetIds;
            delete answers.vpc?.privateApiGatewayVpcEndpoint;
        }

        return answers;
    }

    private getParameterOverrides(answers: Answers): string[] {
        const parameterOverrides = [
            `Environment=${answers.environment}`,
            `ExistingVpcId=N/A`,
            `ExistingCDFSecurityGroupId=`,
            `ExistingPrivateSubnetIds=`,
            `ExistingPublicSubnetIds=`,
            `ExistingPrivateApiGatewayVPCEndpoint=`,
            `ExistingPrivateRouteTableIds=`,
            `EnableS3VpcEndpoint=${true}`,
            `EnableDynamoDBVpcEndpoint=${answers.notifications?.useDax ?? false}`,
            `EnablePrivateApiGatewayVPCEndpoint=${
                answers.apigw?.type === 'Private' ? true : false
            }`,
        ];
        return parameterOverrides;
    }

    public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
        const tasks: ListrTask[] = [
            {
                title: `Packing module '${this.name}'`,
                task: async () => {
                    const monorepoRoot = await getMonorepoRoot();
                    await packageAndUploadTemplate({
                        answers: answers,
                        serviceName: 'vpc',
                        templateFile: 'cfn-networking.yaml',
                        cwd: path.join(monorepoRoot, 'source', 'infrastructure', 'cloudformation'),
                        parameterOverrides: this.getParameterOverrides(answers),
                        needsPackaging: false,
                    });
                },
            },
        ];

        return [answers, tasks];
    }

    public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {
        ow(answers, ow.object.nonEmpty);

        const tasks: ListrTask[] = [];

        const monorepoRoot = await getMonorepoRoot();

        if (answers.vpc?.useExisting === false) {
            ow(answers.environment, ow.string.nonEmpty);
            ow(answers.region, ow.string.nonEmpty);

            tasks.push(
                {
                    title: `Deploying stack '${this.stackName}'`,
                    task: async () => {
                        await packageAndDeployStack({
                            answers: answers,
                            stackName: this.stackName,
                            serviceName: 'vpc',
                            templateFile: 'cfn-networking.yaml',
                            parameterOverrides: this.getParameterOverrides(answers),
                            needsCapabilityNamedIAM: true,
                            cwd: path.join(
                                monorepoRoot,
                                'source',
                                'infrastructure',
                                'cloudformation'
                            ),
                        });
                    },
                },
                {
                    title: `Retrieving network information from stack '${this.stackName}'`,
                    task: async () => {
                        const byOutputKey = await getStackOutputs(this.stackName, answers.region);
                        answers.vpc.id = byOutputKey('VpcId');
                        answers.vpc.securityGroupId = byOutputKey('CDFSecurityGroupId');
                        answers.vpc.privateSubnetIds = byOutputKey('PrivateSubnetIds');
                        answers.vpc.publicSubnetIds = byOutputKey('PublicSubnetIds');
                        answers.vpc.privateApiGatewayVpcEndpoint = byOutputKey(
                            'PrivateApiGatewayVPCEndpoint'
                        );
                    },
                }
            );
        }

        return [answers, tasks];
    }

    public async delete(answers: Answers): Promise<ListrTask[]> {
        const tasks: ListrTask[] = [];
        tasks.push({
            title: `Deleting stack '${this.stackName}'`,
            task: async () => {
                await deleteStack(this.stackName, answers.region);
            },
        });
        return tasks;
    }
}
