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
import { ModuleName, ServiceModule } from '../../../models/modules';
import { applicationConfigurationPrompt } from '../../../prompts/applicationConfiguration.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';
import {
    deleteStack,
    getStackResourceSummaries,
    packageAndDeployStack,
    packageAndUploadTemplate,
} from '../../../utils/cloudformation.util';
import { ConfigBuilder } from '../../../utils/configBuilder';

export class CertificateActivatorInstaller implements ServiceModule {
    public readonly friendlyName = 'Certificate Activator';
    public readonly name = 'certificateActivator';

    public readonly type = 'SERVICE';
    public readonly dependsOnMandatory: ModuleName[] = ['openSsl', 'assetLibrary', 'provisioning'];
    public readonly dependsOnOptional: ModuleName[] = [];
    public readonly stackName: string;
    private readonly assetLibraryStackName: string;
    private readonly provisioningStackName: string;

    constructor(environment: string) {
        this.stackName = `cdf-certificateactivator-${environment}`;
        this.assetLibraryStackName = `cdf-assetlibrary-${environment}`;
        this.provisioningStackName = `cdf-provisioning-${environment}`;
    }

    public async prompts(answers: Answers): Promise<Answers> {
        delete answers.certificateActivator?.redeploy;
        let updatedAnswers: Answers = await inquirer.prompt(
            [redeployIfAlreadyExistsPrompt(this.name, this.stackName)],
            answers,
        );
        if ((updatedAnswers.certificateActivator?.redeploy ?? true) === false) {
            return updatedAnswers;
        }

        updatedAnswers = await inquirer.prompt(
            [
                ...applicationConfigurationPrompt(this.name, answers, [
                    {
                        defaultConfiguration: 'crl/crl.json',
                        propertyName: 'crlKey',
                        question: 'Certifcate Revocation List S3 Key',
                    },
                ]),
            ],
            updatedAnswers,
        );

        return updatedAnswers;
    }

    private getParameterOverrides(answers: Answers): string[] {
        const parameterOverrides = [
            `Environment=${answers.environment}`,
            `BucketName=${answers.s3.bucket}`,
            `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
            `AssetLibraryFunctionName=${answers.certificateActivator.assetLibraryFunctionName}`,
            `ProvisioningFunctionName=${answers.certificateActivator.provisioningFunctionName}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
            if (value !== undefined) parameterOverrides.push(`${key}=${value}`);
        };

        addIfSpecified(
            'ApplicationConfigurationOverride',
            this.generateApplicationConfiguration(answers),
        );

        return parameterOverrides;
    }

    public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
        const monorepoRoot = await getMonorepoRoot();
        const tasks: ListrTask[] = [
            {
                title: `Packaging module '${this.name}'`,
                task: async () => {
                    await packageAndUploadTemplate({
                        answers: answers,
                        serviceName: 'certificateactivator',
                        templateFile: 'infrastructure/cfn-certificateactivator.yml',
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'services',
                            'certificateactivator',
                        ),
                        parameterOverrides: this.getParameterOverrides(answers),
                    });
                },
            },
        ];
        return [answers, tasks];
    }

    public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {
        ow(answers, ow.object.nonEmpty);
        ow(answers.certificateActivator, ow.object.nonEmpty);
        ow(answers.environment, ow.string.nonEmpty);
        ow(answers.s3.bucket, ow.string.nonEmpty);

        const monorepoRoot = await getMonorepoRoot();
        const tasks: ListrTask[] = [];

        if ((answers.certificateActivator.redeploy ?? true) === false) {
            return [answers, tasks];
        }

        tasks.push({
            title: `Detecting environment config for stack '${this.stackName}'`,
            task: async () => {
                if (answers.certificateActivator === undefined) {
                    answers.certificateActivator = {};
                }
                const assetlibrarybyResourceLogicalId = await getStackResourceSummaries(
                    this.assetLibraryStackName,
                    answers.region,
                );
                const provisioningbyResourceLogicalId = await getStackResourceSummaries(
                    this.provisioningStackName,
                    answers.region,
                );
                answers.certificateActivator.provisioningFunctionName =
                    provisioningbyResourceLogicalId('LambdaFunction');
                answers.certificateActivator.assetLibraryFunctionName =
                    assetlibrarybyResourceLogicalId('LambdaFunction');
            },
        });

        tasks.push({
            title: `Packaging and deploying stack '${this.stackName}'`,
            task: async () => {
                await packageAndDeployStack({
                    answers: answers,
                    stackName: this.stackName,
                    serviceName: 'certificateactivator',
                    templateFile: 'infrastructure/cfn-certificateactivator.yml',
                    cwd: path.join(
                        monorepoRoot,
                        'source',
                        'packages',
                        'services',
                        'certificateactivator',
                    ),
                    parameterOverrides: this.getParameterOverrides(answers),
                    needsPackaging: true,
                    needsCapabilityNamedIAM: true,
                });
            },
        });

        return [answers, tasks];
    }

    private generateApplicationConfiguration(answers: Answers): string {
        const configBuilder = new ConfigBuilder();

        configBuilder
            .add(`LOGGING_LEVEL`, answers.certificateActivator.loggingLevel)
            .add(`AWS_S3_CRL_KEY`, answers.certificateActivator.crlKey);

        return configBuilder.config;
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
