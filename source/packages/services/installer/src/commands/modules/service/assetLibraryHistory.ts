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

export class AssetLibraryHistoryInstaller implements RestModule {
    public readonly friendlyName = 'Asset Library History';
    public readonly name = 'assetLibraryHistory';
    public readonly localProjectDir = 'assetlibraryhistory';

    public readonly type = 'SERVICE';
    public readonly dependsOnMandatory: ModuleName[] = ['apigw', 'deploymentHelper', 'kms'];

    public readonly dependsOnOptional: ModuleName[] = [];
    public readonly stackName: string;

    constructor(environment: string) {
        this.stackName = `cdf-assetlibraryhistory-${environment}`;
    }

    public async prompts(answers: Answers): Promise<Answers> {
        delete answers.assetLibraryHistory?.redeploy;
        let updatedAnswers: Answers = await inquirer.prompt(
            [
                redeployIfAlreadyExistsPrompt(this.name, this.stackName),
                {
                    message: `Provisioned Capacity for the dynamo table?`,
                    type: 'input',
                    name: 'assetLibraryHistory.dynamoCapacity',
                    default: answers.assetLibraryHistory?.dynamoCapacity ?? 5,
                    askAnswered: true,
                    validate(answer: number) {
                        if (answer > 0) {
                            return 'Capacity must be greater than 0';
                        }
                        return true;
                    },
                },
            ],
            answers
        );
        if ((updatedAnswers.assetLibraryHistory?.redeploy ?? true) === false) {
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
            `VpcId=${answers.vpc?.id ?? 'N/A'}`,
            `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
            `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
            `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
            `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
            `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
            `AuthType=${answers.apigw.type}`,
            `KmsKeyId=${answers.kms.id}`,
            `DynamoProvisionedThroughputCapacity=${answers.assetLibraryHistory.dynamoCapacity}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
            if (value !== undefined) parameterOverrides.push(`${key}=${value}`);
        };

        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified(
            'ApplicationConfigurationOverride',
            this.generateApplicationConfiguration(answers)
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
                        serviceName: 'assetlibrary-history',
                        templateFile: 'infrastructure/cfn-assetLibraryHistory.yml',
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'services',
                            'assetlibraryhistory'
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
        ow(answers.environment, ow.string.nonEmpty);
        ow(answers.assetLibraryHistory, ow.object.nonEmpty);

        const monorepoRoot = await getMonorepoRoot();
        const tasks: ListrTask[] = [];

        if ((answers.assetLibraryHistory.redeploy ?? true) === false) {
            return [answers, tasks];
        }

        tasks.push({
            title: `Packaging and deploying stack '${this.stackName}'`,
            task: async () => {
                await packageAndDeployStack({
                    answers: answers,
                    stackName: this.stackName,
                    serviceName: 'assetlibrary-history',
                    templateFile: 'infrastructure/cfn-assetLibraryHistory.yml',
                    cwd: path.join(
                        monorepoRoot,
                        'source',
                        'packages',
                        'services',
                        'assetlibraryhistory'
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
            .add(`CUSTOMDOMAIN_BASEPATH`, answers.assetLibraryHistory.customDomainBasePath)
            .add(`LOGGING_LEVEL`, answers.assetLibraryHistory.loggingLevel)
            .add(`CORS_ORIGIN`, answers.apigw.corsOrigin);

        return configBuilder.config;
    }

    public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
        const byOutputKey = await getStackOutputs(this.stackName, answers.region);
        return {
            key: 'assetlibraryhistory_base_url',
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
