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

import { LambdaClient, ListLayerVersionsCommand } from '@aws-sdk/client-lambda';

import { Answers } from '../../../models/answers';
import { InfrastructureModule, ModuleName } from '../../../models/modules';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';
import {
    deleteStack,
    packageAndDeployStack,
    packageAndUploadTemplate,
} from '../../../utils/cloudformation.util';

export class OpenSslInstaller implements InfrastructureModule {
    public readonly friendlyName = 'OpenSSL Lambda Layer';
    public readonly name = 'openSsl';
    public readonly dependsOnMandatory: ModuleName[] = [];
    public readonly dependsOnOptional: ModuleName[] = [];
    public readonly type = 'INFRASTRUCTURE';

    private readonly stackName: string;

    constructor(environment: string) {
        this.stackName = `cdf-openssl-${environment}`;
    }

    public async prompts(answers: Answers): Promise<Answers> {
        if (answers.openSsl === undefined) {
            answers.openSsl = {};
        }

        // check to see if openssl lambda layer already exists
        const lambda = new LambdaClient({ region: answers.region });
        const r = await lambda.send(
            new ListLayerVersionsCommand({
                LayerName: 'cdf-openssl',
            })
        );
        if ((r?.LayerVersions?.length ?? 0) > 0) {
            // if it does exist, ask whether it needs to be re built and uploaded
            answers = await inquirer.prompt(
                [
                    {
                        message:
                            'The cdf-openssl lambda layer has been previously deployed. Does it need redeploying?',
                        type: 'confirm',
                        name: 'openSsl.deploy',
                        default: false,
                        askAnswered: true,
                        when: answers.dryRun === false,
                    },
                ],
                answers
            );
        } else {
            // if not, upload it
            answers.openSsl.deploy = true;
        }
        delete answers.openSsl.arn;
        return answers;
    }

    public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
        const tasks: ListrTask[] = [
            {
                title: `Packaging module '${this.name}'`,
                task: async () => {
                    const monorepoRoot = await getMonorepoRoot();
                    await packageAndUploadTemplate({
                        answers: answers,
                        serviceName: 'openssl',
                        templateFile: 'infrastructure/cfn-openssl-layer.yml',
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'infrastructure',
                            'lambdaLayers',
                            'openssl'
                        ),
                        parameterOverrides: [`Environment=${answers.environment}`],
                    });
                },
            },
        ];
        return [answers, tasks];
    }

    public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {
        ow(answers, ow.object.plain);
        ow(answers.openSsl, ow.object.plain);
        ow(answers.region, ow.string.nonEmpty);

        const tasks: ListrTask[] = [];

        const monorepoRoot = await getMonorepoRoot();

        if (answers.openSsl.deploy) {
            tasks.push({
                title: `Packaging and deploying stack '${this.stackName}'`,
                task: async () => {
                    await packageAndDeployStack({
                        answers: answers,
                        stackName: this.stackName,
                        serviceName: 'openssl',
                        templateFile: 'infrastructure/cfn-openssl-layer.yml',
                        parameterOverrides: [`Environment=${answers.environment}`],
                        needsPackaging: true,
                        needsCapabilityNamedIAM: true,
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'infrastructure',
                            'lambdaLayers',
                            'openssl'
                        ),
                    });
                },
            });
        }

        tasks.push({
            title: 'Retrieving OpenSSL lambda layer arn',
            task: async () => {
                const lambda = new LambdaClient({ region: answers.region });
                const r = await lambda.send(
                    new ListLayerVersionsCommand({
                        LayerName: 'cdf-openssl',
                    })
                );

                if ((r?.LayerVersions?.length ?? 0) === 0) {
                    throw new Error('Failed to retrieve cdf-openssl layer version');
                }

                answers.openSsl.arn = r.LayerVersions[0].LayerVersionArn;
            },
        });

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
