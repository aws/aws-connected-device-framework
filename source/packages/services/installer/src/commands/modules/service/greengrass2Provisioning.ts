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
import { deleteStack, getStackOutputs, getStackParameters, getStackResourceSummaries, packageAndDeployStack } from '../../../utils/cloudformation.util';
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

  constructor(environment: string) {
    this.stackName = `cdf-greengrass2-provisioning-${environment}`
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.greengrass2Provisioning?.redeploy;

    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);

    if ((updatedAnswers.greengrass2Provisioning?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      {
        message: 'When using the Asset Library module as an enhanced device registry, the Greengrass2 Provisioning module can use it to help search across devices and groups to define the deployment targets. You have not chosen to install the Asset Library module - would you like to install it?\nNote: as there is additional cost associated with installing the Asset Library module, ensure you familiarize yourself with its capabilities and benefits in the online CDF github documentation.',
        type: 'confirm',
        name: 'greengrass2Provisioning.useAssetLibrary',
        default: updatedAnswers.greengrass2Provisioning?.useAssetLibrary ?? false,
        askAnswered: true,
      },
      enableAutoScaling(this.name, answers),
      provisionedConcurrentExecutions(this.name, answers),
      ...applicationConfigurationPrompt(this.name, answers, [
        {
          defaultConfiguration: 10,
          propertyName: "promisesConcurrency",
          question: 'The number of concurrent dynamodb operations'
        },
        {
          defaultConfiguration: 20,
          propertyName: "corezBatchSize",
          question: 'Batch size for processing core tasks'
        },
        {
          defaultConfiguration: 20,
          propertyName: "devicesBatchSize",
          question: 'Batch size for processing device tasks'
        },
        {
          defaultConfiguration: 50,
          propertyName: "deploymentsBatchSize",
          question: 'Batch size for processing deployment tasks'
        },

      ]),
      ...customDomainPrompt(this.name, answers),
    ], updatedAnswers);

    updatedAnswers.modules.expandedMandatory = includeOptionalModule('assetLibrary', updatedAnswers.modules, updatedAnswers.greengrass2Provisioning.useAssetLibrary)

    return updatedAnswers;

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
        const grenngrassInstallerbyResourceLogicalId = await getStackResourceSummaries(`cdf-greengrass2-installer-config-generators-${answers.environment}`, answers.region);
        const provisioningbyResourceLogicalId = await getStackResourceSummaries(`cdf-provisioning-${answers.environment}`, answers.region);
        const assetLibrarybyResourceLogicalId = await getStackResourceSummaries(`cdf-assetlibrary-${answers.environment}`, answers.region);

        const manualInstallConfigGenerator = grenngrassInstallerbyResourceLogicalId('ManualInstallConfigLambda');
        const fleetProvisioningConfigGenerator = grenngrassInstallerbyResourceLogicalId('FleetProvisioningConfigLambda');

        answers.greengrass2Provisioning.installerConfigGenerators = JSON.stringify({ MANUAL_INSTALL: manualInstallConfigGenerator, FLEET_PROVISIONING: fleetProvisioningConfigGenerator });

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

        const parameterOverrides = [
          `Environment=${answers.environment}`,
          `AuthType=${answers.apigw.type}`,
          `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
          `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
          `KmsKeyId=${answers.kms.id}`,
          `ArtifactsBucket=${answers.s3.bucket}`,
          `ArtifactsKeyPrefix=greengrass2/artifacts/`,
          `ProvisioningFunctionName=${answers.greengrass2Provisioning.provisioningFunctionName}`,
          `AssetLibraryFunctionName=${answers.greengrass2Provisioning.assetLibraryFunctionName ?? ''}`,
          `InstallerConfigGenerators=${answers.greengrass2Provisioning.installerConfigGenerators ?? ''}`,
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

        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'greengrass2-provisioning',
          templateFile: '../greengrass2-provisioning/infrastructure/cfn-greengrass2-provisioning.yml',
          parameterOverrides,
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
