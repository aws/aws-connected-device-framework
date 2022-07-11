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


import { Answers } from '../../../models/answers';
import { ModuleName, RestModule, PostmanEnvironment } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, getStackOutputs, getStackParameters, getStackResourceSummaries, packageAndDeployStack, packageAndUploadTemplate } from '../../../utils/cloudformation.util';
import { enableAutoScaling, provisionedConcurrentExecutions } from '../../../prompts/autoscaling.prompt';
import { includeOptionalModule } from '../../../utils/modules.util';

export class Greengrass2ProvisioningInstaller implements RestModule {

  public readonly friendlyName = 'Greengrass V2 Provisioning';
  public readonly name = 'greengrass2Provisioning';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'kms',
    'openSsl',
    'deploymentHelper',
    'eventBus',
    'provisioning',
    'greengrass2InstallerConfigGenerators'];
  public readonly dependsOnOptional: ModuleName[] = ['assetLibrary'];

  private readonly stackName: string;
  private readonly defaultInstallerConfigGenerators: Record<string, string>;

  constructor(environment: string) {
    this.stackName = `cdf-greengrass2-provisioning-${environment}`;

    // matches ManualInstallConfigLambda resource logical ID
    const manualInstallConfigGenerator = `cdf-greengrass2-manual-config-generator-${environment}`
    // matches FleetProvisioningConfigLambda resource logical ID
    const fleetProvisioningConfigGenerator = `cdf-greengrass2-fleet-config-generator-${environment}`
    this.defaultInstallerConfigGenerators = { MANUAL_INSTALL: manualInstallConfigGenerator, FLEET_PROVISIONING: fleetProvisioningConfigGenerator };
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.greengrass2Provisioning?.redeploy;

    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);

    if ((updatedAnswers.greengrass2Provisioning?.redeploy ?? true)) {

      updatedAnswers = await inquirer.prompt([
        {
          message: `Do you want the module to publish all operation events to CDF EventBridge?`,
          type: 'confirm',
          name: 'greengrass2Provisioning.enablePublishEvents',
          default: answers.greengrass2Provisioning?.enablePublishEvents ?? true,
          askAnswered: true
        },
        {
          message: 'When using the Asset Library module as an enhanced device registry, the Greengrass2 Provisioning module can use it to help search across devices and groups to define the deployment targets. You have not chosen to install the Asset Library module - would you like to install it?\nNote: as there is additional cost associated with installing the Asset Library module, ensure you familiarize yourself with its capabilities and benefits in the online CDF github documentation.',
          type: 'confirm',
          name: 'greengrass2Provisioning.useAssetLibrary',
          default: updatedAnswers.greengrass2Provisioning?.useAssetLibrary ?? false,
          askAnswered: true,
        },
      ], updatedAnswers);

      updatedAnswers.greengrass2Provisioning.installerConfigGenerators = (
        updatedAnswers.greengrass2Provisioning.installerConfigGenerators || this.defaultInstallerConfigGenerators
      );
      let configGeneratorsPromptAction: configGeneratorsPromptActionChoices;
      enum configGeneratorsPromptActionChoices { Confirm, Add, Delete, }

      while (configGeneratorsPromptAction != configGeneratorsPromptActionChoices.Confirm) {
        if (Object.keys(updatedAnswers.greengrass2Provisioning.installerConfigGenerators).length === 0) {
          configGeneratorsPromptAction = configGeneratorsPromptActionChoices.Add;
        }
        else {
          const installerConfigGeneratorsAsStringList = (
            Object.entries(updatedAnswers.greengrass2Provisioning.installerConfigGenerators)
              .map(([k, v]) => ` * ${k}: ${v}`).join("\n")
          );
          (
            { configGeneratorsPromptAction } = await inquirer.prompt([
              {
                type: 'list',
                name: 'configGeneratorsPromptAction',
                message: `The following config generator aliases are currently configured:\n${installerConfigGeneratorsAsStringList}\nWhat do you want to do next?`,
                choices: [
                  { name: 'confirm list and continue', value: configGeneratorsPromptActionChoices.Confirm },
                  { name: 'add another config generator alias', value: configGeneratorsPromptActionChoices.Add },
                  { name: 'delete an entry from the list', value: configGeneratorsPromptActionChoices.Delete },
                ],
                default: configGeneratorsPromptActionChoices.Confirm,
              }
            ], {})
          );
        }

        if (configGeneratorsPromptAction === configGeneratorsPromptActionChoices.Add) {
          const newConfigGenerator: { alias: string, lambda: string } = await inquirer.prompt([
            {
              type: 'input',
              name: 'alias',
              message: `Enter the config generator alias which will be used in requests to the CDF API`,
              validate: (answer) => {
                if (updatedAnswers.greengrass2Provisioning.installerConfigGenerators[answer] !== undefined) {
                  return `The alias "${answer} is already in use, aliases must be unique."`;
                }
                if (answer.length === 0) {
                  return "Please enter a value."
                }
                return true;
              }
            },
            {
              type: 'input',
              name: 'lambda',
              message: `Enter the the name of the Lambda that CDF will invoke for this config generator`,
              validate: (answer) => {
                if (answer.startsWith("arn:")) {
                  return `Please enter the name of the Lambda, not the ARN."`;
                }
                if (answer.length === 0) {
                  return "Please enter a value."
                }
                return true;
              }
            },
          ], {});
          updatedAnswers.greengrass2Provisioning.installerConfigGenerators[newConfigGenerator.alias] = newConfigGenerator.lambda;
        }
        else if (configGeneratorsPromptAction === configGeneratorsPromptActionChoices.Delete) {
          const configGeneratorAliasesToDelete: { list: string[] } = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'list',
              message: `Select one or more config generators to delete from the list`,
              choices: Object.keys(updatedAnswers.greengrass2Provisioning.installerConfigGenerators),
              default: configGeneratorsPromptActionChoices.Confirm,
            }
          ], {});
          configGeneratorAliasesToDelete.list.forEach(
            (alias) => delete updatedAnswers.greengrass2Provisioning.installerConfigGenerators[alias]
          );
        }
      }

      updatedAnswers = await inquirer.prompt([
        enableAutoScaling(this.name, answers),
        provisionedConcurrentExecutions(this.name, answers),
        ...applicationConfigurationPrompt(this.name, answers, []),
        ...customDomainPrompt(this.name, answers),
      ], updatedAnswers);
    }

    includeOptionalModule('assetLibrary', updatedAnswers.modules, updatedAnswers.greengrass2Provisioning.useAssetLibrary)

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
      `EnablePublishEvents=${answers.greengrass2Provisioning.enablePublishEvents}`,
      `ArtifactsKeyPrefix=greengrass2/artifacts/`,
      `ProvisioningFunctionName=${answers.greengrass2Provisioning.provisioningFunctionName}`,
      `AssetLibraryFunctionName=${answers.greengrass2Provisioning.assetLibraryFunctionName ?? ''}`,
      `InstallerConfigGenerators=${JSON.stringify(
        answers.greengrass2Provisioning.installerConfigGenerators ?? this.defaultInstallerConfigGenerators
      )}`,
      `EventBridgeBusName=${answers.eventBus.arn}`,
      `VpcId=${answers.vpc?.id ?? 'N/A'}`,
      `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
      `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
      `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
    ];

    const addIfSpecified = (key: string, value: unknown) => {
      if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
    };

    addIfSpecified('ApplyAutoscaling', answers.greengrass2Provisioning.enableAutoScaling);
    addIfSpecified('ProvisionedConcurrentExecutions', answers.greengrass2Provisioning.provisionedConcurrentExecutions);
    addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
    addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
    addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

    return parameterOverrides;
  }

  public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
    const tasks: ListrTask[] = [{
      title: `Packaging module '${this.name}'`,
      task: async () => {
        await packageAndUploadTemplate({
          answers: answers,
          serviceName: 'greengrass2-provisioning',
          templateFile: '../greengrass2-provisioning/infrastructure/cfn-greengrass2-provisioning.yml',
          parameterOverrides: this.getParameterOverrides(answers),
        });
      },
    }
    ];
    return [answers, tasks]
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.plain);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.region, ow.string.nonEmpty);
    ow(answers.s3.bucket, ow.string.nonEmpty);
    ow(answers.apigw.type, ow.string.nonEmpty);
    ow(answers.apigw.templateSnippetS3UriBase, ow.string.nonEmpty);
    ow(answers.apigw.cloudFormationTemplate, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.greengrass2Provisioning.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Detecting environment config for stack '${this.stackName}'`,
      task: async () => {
        if (answers.greengrass2Provisioning === undefined) {
          answers.greengrass2Provisioning = {};
        }
        const provisioningbyResourceLogicalId = await getStackResourceSummaries(`cdf-provisioning-${answers.environment}`, answers.region);
        const assetLibrarybyResourceLogicalId = await getStackResourceSummaries(`cdf-assetlibrary-${answers.environment}`, answers.region);

        answers.greengrass2Provisioning.provisioningFunctionName = provisioningbyResourceLogicalId('LambdaFunction');

        if (answers.greengrass2Provisioning.provisioningFunctionName === undefined) {
          throw new Error(`Could not find provisioning function name for environment '${answers.environment}'`);
        }

        // asset library integration is optional
        answers.greengrass2Provisioning.assetLibraryFunctionName = assetLibrarybyResourceLogicalId('LambdaFunction');
      }
    });

    tasks.push({
      title: `Packaging and deploying stack '${this.stackName}'`,
      task: async () => {
        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'greengrass2-provisioning',
          templateFile: '../greengrass2-provisioning/infrastructure/cfn-greengrass2-provisioning.yml',
          parameterOverrides: this.getParameterOverrides(answers),
          needsPackaging: true,
          needsCapabilityNamedIAM: true,
          needsCapabilityAutoExpand: true,
        });
      }
    });

    return [answers, tasks];

  }

  public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
    const byOutputKey = await getStackOutputs(this.stackName, answers.region)
    return {
      key: 'greengrass2_provisioning_base_url',
      value: byOutputKey('ApiGatewayUrl'),
      enabled: true
    }
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()

    configBuilder
      .add(`CUSTOMDOMAIN_BASEPATH`, answers.greengrass2Provisioning.customDomainBasePath)
      .add(`LOGGING_LEVEL`, answers.greengrass2Provisioning.loggingLevel)
      .add(`CORS_ORIGIN`, answers.apigw.corsOrigin)
      .add(`PROMISES_CONCURRENCY`, answers.greengrass2Provisioning.promisesConcurrency)
      .add(`CORES_BATCH_SIZE`, answers.greengrass2Provisioning.corezBatchSize)
      .add(`DEVICES_BATCH_SIZE`, answers.greengrass2Provisioning.devicesBatchSize)
      .add(`DEPLOYMENTS_BATCH_SIZE`, answers.greengrass2Provisioning.deploymentsBatchSize)

    return configBuilder.config;
  }

  public async generateLocalConfiguration(answers: Answers): Promise<string> {

    const byParameterKey = await getStackParameters(this.stackName, answers.region)
    const byResourceLogicalId = await getStackResourceSummaries(this.stackName, answers.region)

    const configBuilder = new ConfigBuilder()
      .add(`AWS_DYNAMODB_TABLE_NAME`, byResourceLogicalId('Table'))
      .add(`AWS_EVENTBRIDGE_BUS_NAME`, byParameterKey('EventBridgeBusName'))
      .add(`AWS_SQS_QUEUES_CORE_TASKS=`, byResourceLogicalId('CoreTasksQueue'))
      .add(`AWS_SQS_QUEUES_DEPLOYMENT_TASKS`, byResourceLogicalId('DeploymentTasksQueue'))
      .add(`AWS_SQS_QUEUES_DEVICE_TASKS`, byResourceLogicalId('DeploymentTasksQueue'))
      .add(`AWS_SQS_QUEUES_CORE_TASKS_STATUS`, byResourceLogicalId('CoreTasksStatusQueue'))
      .add(`AWS_S3_ARTIFACTS_BUCKET`, byParameterKey('ArtifactsBucket'))
      .add(`AWS_S3_ARTIFACTS_PREFIX`, byParameterKey('ArtifactsKeyPrefix'))
      .add(`PROVISIONING_API_FUNCTION_NAME`, byParameterKey('ProvisioningFunctionName'))
      .add(`ASSETLIBRARY_API_FUNCTION_NAME`, byParameterKey('AssetLibraryFunctionName'))
      .add(`CDF_SERVICE_EVENTBRIDGE_SOURCE`, byParameterKey('CdfServiceEventBridgeSource'))
      .add(`INSTALLER_CONFIG_GENERATORS`, byParameterKey('InstallerConfigGenerators'))

    return configBuilder.config;
  }


  public async delete(answers: Answers): Promise<ListrTask[]> {
    const tasks: ListrTask[] = [];
    tasks.push({
      title: `Deleting stack '${this.stackName}'`,
      task: async () => {
        await deleteStack(this.stackName, answers.region)
      }
    });
    return tasks

  }
}
