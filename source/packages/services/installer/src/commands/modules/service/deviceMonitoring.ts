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
import { ConfigBuilder } from '../../../utils/configBuilder';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from '../../../prompts/applicationConfiguration.prompt';
import {
    deleteStack,
    getStackResourceSummaries,
    packageAndDeployStack,
    packageAndUploadTemplate,
} from '../../../utils/cloudformation.util';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';

export class DeviceMonitoringInstaller implements ServiceModule {
    public readonly friendlyName = 'Device Monitoring';
    public readonly name = 'deviceMonitoring';
    public readonly localProjectDir = 'device-monitoring';

    public readonly type = 'SERVICE';
    public readonly dependsOnMandatory: ModuleName[] = ['assetLibrary'];
    public readonly dependsOnOptional: ModuleName[] = [];
    public readonly stackName: string;
    private readonly assetLibraryStackName: string;

    constructor(environment: string) {
        this.stackName = `cdf-device-monitoring-${environment}`;
        this.assetLibraryStackName = `cdf-assetlibrary-${environment}`;
    }

    public async prompts(answers: Answers): Promise<Answers> {
        delete answers.deviceMonitoring?.redeploy;
        let updatedAnswers: Answers = await inquirer.prompt(
            [redeployIfAlreadyExistsPrompt(this.name, this.stackName)],
            answers,
        );

        if ((updatedAnswers.deviceMonitoring?.redeploy ?? true) === false) {
            return updatedAnswers;
        }

        updatedAnswers = await inquirer.prompt(
            applicationConfigurationPrompt(this.name, answers, []),
            updatedAnswers,
        );
        return updatedAnswers;
    }

    private getParameterOverrides(answers: Answers): string[] {
        const parameterOverrides = [
            `Environment=${answers.environment}`,
            `AssetLibraryFunctionName=${answers.deviceMonitoring.assetLibraryFunctionName}`,
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
                        serviceName: 'device-monitoring',
                        templateFile: 'infrastructure/cfn-device-monitoring.yml',
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'services',
                            'device-monitoring',
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
        ow(answers.deviceMonitoring, ow.object.nonEmpty);
        ow(answers.environment, ow.string.nonEmpty);
        ow(answers.s3.bucket, ow.string.nonEmpty);

        const monorepoRoot = await getMonorepoRoot();
        const tasks: ListrTask[] = [];

        if ((answers.deviceMonitoring.redeploy ?? true) === false) {
            return [answers, tasks];
        }

        tasks.push({
            title: `Detecting environment config for stack '${this.stackName}'`,
            task: async () => {
                if (answers.deviceMonitoring === undefined) {
                    answers.deviceMonitoring = {};
                }
                const assetlibrarybyResourceLogicalId = await getStackResourceSummaries(
                    this.assetLibraryStackName,
                    answers.region,
                );
                answers.deviceMonitoring.assetLibraryFunctionName =
                    assetlibrarybyResourceLogicalId('LambdaFunction');
            },
        });

        tasks.push({
            title: `Packaging and deploying stack '${this.stackName}'`,
            task: async () => {
                await packageAndDeployStack({
                    answers: answers,
                    stackName: this.stackName,
                    serviceName: 'device-monitoring',
                    templateFile: 'infrastructure/cfn-device-monitoring.yml',
                    cwd: path.join(
                        monorepoRoot,
                        'source',
                        'packages',
                        'services',
                        'device-monitoring',
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
        configBuilder.add(`LOGGING_LEVEL`, answers.deviceMonitoring.loggingLevel);
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
