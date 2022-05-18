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
import { Answers } from '../../../models/answers';
import { ListrTask } from 'listr2';
import { ModuleName, RestModule, PostmanEnvironment } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import inquirer from 'inquirer';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import ow from 'ow';
import { deleteStack, getStackOutputs, getStackParameters, getStackResourceSummaries, packageAndDeployStack, packageAndUploadTemplate } from '../../../utils/cloudformation.util';
import { includeOptionalModule } from '../../../utils/modules.util';

export class CommandAndControlInstaller implements RestModule {

  public readonly friendlyName = 'Command And Control';
  public readonly name = 'commandAndControl';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'kms',
    'deploymentHelper',
    'provisioning'];
  public readonly dependsOnOptional: ModuleName[] = ['assetLibrary'];

  private readonly stackName: string;
  private readonly assetLibraryStackName: string;
  private readonly provisioningStackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-commandandcontrol-${environment}`
    this.assetLibraryStackName = `cdf-assetlibrary-${environment}`;
    this.provisioningStackName = `cdf-provisioning-${environment}`;
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.commandAndControl?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),

    ], answers);
    if (updatedAnswers.commandAndControl?.redeploy ?? true) {

      updatedAnswers = await inquirer.prompt([
        {
          message: 'When using the Asset Library module as an enhanced device registry, the Command & Control module can use it to help search across devices and groups to define the command targets. You have not chosen to install the Asset Library module - would you like to install it?\nNote: as there is additional cost associated with installing the Asset Library module, ensure you familiarize yourself with its capabilities and benefits in the online CDF github documentation.',
          type: 'confirm',
          name: 'commandAndControl.useAssetLibrary',
          default: updatedAnswers.commandAndControl?.useAssetLibrary,
          askAnswered: true
        },
        ...applicationConfigurationPrompt(this.name, answers, []),
        ...customDomainPrompt(this.name, answers)
      ], updatedAnswers);
    }

    includeOptionalModule('assetLibrary', updatedAnswers.modules, updatedAnswers.commandAndControl.useAssetLibrary)
    return updatedAnswers;
  }
  
  public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
    const tasks: ListrTask[] = [{
      title: `Packaging module '${this.name}'`,
      task: async () => {
        await packageAndUploadTemplate({
          answers: answers,
          templateFile: '../command-and-control/infrastructure/cfn-command-and-control.yml',
        });
      },
    }
    ];
    return [answers, tasks]
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.commandAndControl, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.s3.bucket, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.commandAndControl.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Detecting environment config for stack '${this.stackName}'`,
      task: async () => {
        if (answers.commandAndControl === undefined) {
          answers.commandAndControl = {};
        }
        const assetlibrarybyResourceLogicalId = await getStackResourceSummaries(this.assetLibraryStackName, answers.region);
        const provisioningbyResourceLogicalId = await getStackResourceSummaries(this.provisioningStackName, answers.region);
        answers.commandAndControl.provisioningFunctionName = provisioningbyResourceLogicalId('LambdaFunction');
        answers.commandAndControl.assetLibraryFunctionName = assetlibrarybyResourceLogicalId('LambdaFunction');
      }
    });

    tasks.push({
      title: `Packaging and deploying stack '${this.stackName}'`,
      task: async () => {
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
          `BucketName=${answers.s3.bucket}`,
          `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
          `ProvisioningFunctionName=${answers.commandAndControl.provisioningFunctionName}`,
          `AssetLibraryFunctionName=${answers.commandAndControl.assetLibraryFunctionName ?? ''}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'commandandcontrol',
          templateFile: '../command-and-control/infrastructure/cfn-command-and-control.yml',
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
      key: 'commandandcontrol_base_url',
      value: byOutputKey('ApiGatewayUrl'),
      enabled: true
    }
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()
    configBuilder
      .add(`CUSTOMDOMAIN_BASEPATH`, answers.commandAndControl.customDomainBasePath)
      .add(`LOGGING_LEVEL`, answers.commandAndControl.loggingLevel)
      .add(`CORS_ORIGIN`, answers.apigw.corsOrigin)
      .add(`PROVISIONING_TEMPLATES_ADDTHINGTOTHINGGROUP`, answers.commandAndControl.addThingToGroupTemplate)

    return configBuilder.config;
  }

  public async generateLocalConfiguration(answers: Answers): Promise<string> {
    const byParameterKey = await getStackParameters(this.stackName, answers.region)
    const byResourceLogicalId = await getStackResourceSummaries(this.stackName, answers.region)

    const configBuilder = new ConfigBuilder()
    configBuilder
      .add(`COMMANDANDCONTROL_AWS_S3_BUCKET`, byParameterKey('BucketName'))
      .add(`COMMANDANDCONTROL_AWS_S3_ROLE_ARN`, `arn:aws:iam::${answers.accountId}:role/${byResourceLogicalId('LambdaExecutionRole')}`)
      .add(`COMMANDANDCONTROL_AWS_DYNAMODB_TABLE`, byResourceLogicalId('DataTable'))
      .add(`COMMANDANDCONTROL_ASSETLIBRARY_API_FUNCTION_NAME`, byParameterKey('AssetLibraryFunctionName'))
      .add(`COMMANDANDCONTROL_PROVISIONING_API_FUNCTION_NAME`, byParameterKey('ProvisioningFunctionName'))
      .add(`COMMANDANDCONTROL_AWS_SQS_QUEUES_MESSAGES_QUEUEURL`, byResourceLogicalId('MessagesQueue'))
      .add(`COMMANDANDCONTROL_AWS_SQS_QUEUES_COMMANDS_QUEUEURL`, byResourceLogicalId('CommandsQueue'))
      .add(`COMMANDANDCONTROL_AWS_IOT_ENDPOINT`, answers.iotEndpoint)

    return configBuilder.config
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
