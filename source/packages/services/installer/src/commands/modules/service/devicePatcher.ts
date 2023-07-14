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
import { ModuleName, PostmanEnvironment, RestModule } from '../../../models/modules';
import { applicationConfigurationPrompt } from '../../../prompts/applicationConfiguration.prompt';
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';
import {
    deleteStack,
    getStackOutputs,
    packageAndDeployStack,
    packageAndUploadTemplate,
} from '../../../utils/cloudformation.util';
import { ConfigBuilder } from '../../../utils/configBuilder';

export class DevicePatcherInstaller implements RestModule {
    public readonly friendlyName = 'Device Patcher';
    public readonly name = 'devicePatcher';
    public readonly localProjectDir = 'device-patcher';

    public readonly type = 'SERVICE';
    public readonly dependsOnMandatory: ModuleName[] = ['apigw', 'kms', 'openSsl'];

    public readonly dependsOnOptional: ModuleName[] = [];

    public readonly stackName: string;

    constructor(environment: string) {
        this.stackName = `cdf-device-patcher-${environment}`;
    }

    public async prompts(answers: Answers): Promise<Answers> {
        delete answers.devicePatcher?.redeploy;
        let updatedAnswers: Answers = await inquirer.prompt(
            [redeployIfAlreadyExistsPrompt(this.name, this.stackName)],
            answers
        );
        if ((updatedAnswers.devicePatcher?.redeploy ?? true) === false) {
            return updatedAnswers;
        }

        updatedAnswers = await inquirer.prompt(
            [
                ...applicationConfigurationPrompt(this.name, answers, []),
                ...customDomainPrompt(this.name, answers),
            ],
            updatedAnswers
        );

        return updatedAnswers;
    }

    private getParameterOverrides(answers: Answers): string[] {
        const parameterOverrides = [
            `Environment=${answers.environment}`,
            `AuthType=${answers.apigw.type}`,
            `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
            `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
            `KmsKeyId=${answers.kms.id}`,
            `ArtifactsBucket=${answers.s3.bucket}`,
            `ArtifactsKeyPrefix=device-patcher/`,
            `VpcId=${answers.vpc?.id ?? 'N/A'}`,
            `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
            `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
            `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
            if (value !== undefined) parameterOverrides.push(`${key}=${value}`);
        };

        addIfSpecified(
            'ApplicationConfigurationOverride',
            this.generateApplicationConfiguration(answers)
        );
        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
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
                        serviceName: 'device-patcher',
                        templateFile: 'infrastructure/cfn-device-patcher.yml',
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'services',
                            'device-patcher'
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
        ow(answers.s3.bucket, ow.string.nonEmpty);
        ow(answers.apigw.type, ow.string.nonEmpty);
        ow(answers.apigw.templateSnippetS3UriBase, ow.string.nonEmpty);
        ow(answers.apigw.cloudFormationTemplate, ow.string.nonEmpty);

        const monorepoRoot = await getMonorepoRoot();
        const tasks: ListrTask[] = [];

        if ((answers.devicePatcher.redeploy ?? true) === false) {
            return [answers, tasks];
        }

        tasks.push({
            title: `Packaging and deploying stack '${this.stackName}'`,
            task: async () => {
                await packageAndDeployStack({
                    answers: answers,
                    stackName: this.stackName,
                    serviceName: 'device-patcher',
                    templateFile: 'infrastructure/cfn-device-patcher.yml',
                    cwd: path.join(
                        monorepoRoot,
                        'source',
                        'packages',
                        'services',
                        'device-patcher'
                    ),
                    parameterOverrides: this.getParameterOverrides(answers),
                    needsPackaging: true,
                    needsCapabilityNamedIAM: true,
                    needsCapabilityAutoExpand: true,
                });
            },
        });

        return [answers, tasks];
    }

    private generateApplicationConfiguration(answers: Answers): string {
        const configBuilder = new ConfigBuilder();
        configBuilder
            .add(`CUSTOMDOMAIN_BASEPATH`, answers.devicePatcher.customDomainBasePath)
            .add(`LOGGING_LEVEL`, answers.devicePatcher.loggingLevel)
            .add(`CORS_ORIGIN`, answers.apigw.corsOrigin);
        return configBuilder.config;
    }

    public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
        const byOutputKey = await getStackOutputs(this.stackName, answers.region);
        return {
            key: 'devicepatcher_base_url',
            value: byOutputKey('ApiGatewayUrl'),
            enabled: true,
        };
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
