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
import { deleteStack, getStackOutputs, getStackResourceSummaries, packageAndDeployStack } from '../../../utils/cloudformation.util';
import { includeOptionalModule } from '../../../utils/modules.util';
import { getDaxInstanceTypeList } from '../../../utils/instancetypes';

const DEFAULT_DAX_INSTANCE_TYPE = 'dax.t2.medium';
export class NotificationsInstaller implements RestModule {

  public readonly friendlyName = 'Notifications';
  public readonly name = 'notifications';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'deploymentHelper',
    'kms',
  ];

  public readonly dependsOnOptional: ModuleName[] = [];
  private readonly eventsProcessorStackName: string;
  private readonly eventsAlertStackName: string;

  constructor(environment: string) {
    this.eventsProcessorStackName = `cdf-eventsProcessor-${environment}`
    this.eventsAlertStackName = `cdf-eventsAlerts-${environment}`;
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.notifications?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt('notifications', this.eventsProcessorStackName),
    ], answers);
    if ((updatedAnswers.notifications?.redeploy ?? true)) {

      const daxInstanceTypes = await getDaxInstanceTypeList(
        answers.region,
      );

      updatedAnswers = await inquirer.prompt([
        {
          message: 'Use DAX for DynamoDB caching',
          type: 'confirm',
          name: 'notifications.useDax',
          default: true,
          askAnswered: true
        },
        {
          message: `${(daxInstanceTypes.length > 0) ? "Select" : "Enter"} the DAX database instance type:`,
          type: (daxInstanceTypes.length > 0) ? 'list' : 'input',
          choices: daxInstanceTypes,
          name: 'notifications.daxInstanceType',
          default: (
            answers.notifications?.daxInstanceType ??
              (daxInstanceTypes.indexOf(DEFAULT_DAX_INSTANCE_TYPE) >= 0)
              ? DEFAULT_DAX_INSTANCE_TYPE
              : undefined
          ),
          askAnswered: true,
          loop: false,
          pageSize: 10,
          when(answers: Answers) {
            return answers.notifications?.useDax === true;
          },
          validate(answer: string) {
            if (daxInstanceTypes.length > 0 && !daxInstanceTypes.includes(answer)) {
              return `DAX Instance Type must be one of: ${daxInstanceTypes.join(', ')}`;
            }
            return true;
          }
        },
        {
          message: `Enter TTL (Time to Live) settings for DAX Query Cache in milliseconds`,
          type: 'input',
          name: 'notifications.queryCacheTTL',
          default: (
            answers.notifications?.queryCacheTTL ?? 60000
          ),
          askAnswered: true,
          when(answers: Answers) {
            return answers.notifications?.useDax === true;
          },
          validate(answer: number) {
            if (answer < 0) {
              return `DAX Query Cache TTL has to be larger than 0`;
            }
            return true;
          }
        },
        {
          message: `Enter TTL (Time to Live) settings for DAX Item Cache in milliseconds`,
          type: 'input',
          name: 'notifications.itemCacheTTL',
          default: (
            answers.notifications?.itemCacheTTL ?? 60000
          ),
          askAnswered: true,
          when(answers: Answers) {
            return answers.notifications?.useDax === true;
          },
          validate(answer: number) {
            if (answer < 0) {
              return `DAX Item Cache TTL has to be larger than 0`;
            }
            return true;
          }
        },
        ...applicationConfigurationPrompt(this.name, answers, []),
        ...customDomainPrompt(this.name, answers),
      ], updatedAnswers);
    }

    includeOptionalModule('vpc', updatedAnswers.modules, updatedAnswers.notifications.useDax)

    if (!answers.notifications?.useDax) {
      delete answers.notifications?.itemCacheTTL
      delete answers.notifications?.queryCacheTTL
      delete answers.notifications?.daxInstanceType
      delete answers.notifications?.daxClusterEndpoint
    }

    return updatedAnswers;
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.notifications, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.s3.bucket, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.notifications.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Packaging and deploying stack '${this.eventsProcessorStackName}'`,
      task: async () => {

        const parameterOverrides = [
          `Environment=${answers.environment}`,
          `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
          `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
          `AuthType=${answers.apigw.type}`,
          `KmsKeyId=${answers.kms.id}`,
          `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
          `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`
        ];

        if (!answers.notifications.useDax) {
          // When DAX is disabled, even if VPC is specified we will set it to N/A to match
          // the CloudFormation condition
          parameterOverrides.push(
            `VpcId=${'N/A'}`,
            `CDFSecurityGroupId=${''}`,
            `PrivateSubNetIds=${''}`)
        } else {
          parameterOverrides.push(
            `VpcId=${answers.vpc?.id ?? 'N/A'}`,
            `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
            `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`)
        }

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        }

        addIfSpecified('DAXInstanceType', answers.notifications.daxInstanceType);
        addIfSpecified('QueryCacheTTL', answers.notifications.queryCacheTTL);
        addIfSpecified('ItemCacheTTL', answers.notifications.itemCacheTTL);
        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await packageAndDeployStack({
          answers: answers,
          stackName: this.eventsProcessorStackName,
          serviceName: 'events-processor',
          templateFile: '../events-processor/infrastructure/cfn-eventsProcessor.yml',
          parameterOverrides,
          needsPackaging: true,
          needsCapabilityNamedIAM: true,
          needsCapabilityAutoExpand: true,
        });
      }
    });

    tasks.push({
      title: `Detecting environment config for stack '${this.eventsAlertStackName}'`,
      task: async () => {
        const byOutputKey = await getStackOutputs(this.eventsProcessorStackName, answers.region)
        answers.notifications.notificationsTableName = byOutputKey('EventNotificationsTable')
        answers.notifications.notificationsTableArn = byOutputKey('EventNotificationsTableArn');
        answers.notifications.notificationsTableStreamArn = byOutputKey('EventNotificationsStreamArn');
        answers.notifications.configTableName = byOutputKey('EventConfigTable');
        answers.notifications.configTableArn = byOutputKey('EventConfigTableArn');
        answers.notifications.daxClusterEndpoint = byOutputKey('DAXClusterEndpoint');
        answers.notifications.daxClusterArn = byOutputKey('DAXClusterArn');
      }
    });

    tasks.push({
      title: `Packaging and deploying stack '${this.eventsAlertStackName}'`,
      task: async () => {

        const parameterOverrides = [
          `Environment=${answers.environment}`,
          `KmsKeyId=${answers.kms.id}`,
          `EventNotificationsTable=${answers.notifications.notificationsTableName}`,
          `EventNotificationsTableArn=${answers.notifications.notificationsTableArn}`,
          `EventConfigTable=${answers.notifications.configTableName}`,
          `EventConfigTableArn=${answers.notifications.configTableArn}`,
          `EventNotificationsStreamArn=${answers.notifications.notificationsTableStreamArn}`,
        ]

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('DAXClusterEndpoint', answers.notifications.daxClusterEndpoint);
        addIfSpecified('DAXClusterArn', answers.notifications.daxClusterArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        if (!answers.notifications.daxClusterEndpoint) {
          // When DAX is disabled, even if VPC is specified we will set it to N/A to match
          // the CloudFormation condition
          parameterOverrides.push(
            `CDFSecurityGroupId=${''}`,
            `PrivateSubNetIds=${''}`)
        } else {
          parameterOverrides.push(
            `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
            `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`)
        }

        await packageAndDeployStack({
          answers: answers,
          stackName: this.eventsAlertStackName,
          serviceName: 'events-alerts',
          templateFile: '../events-alerts/infrastructure/cfn-eventsAlerts.yml',
          parameterOverrides,
          needsPackaging: true,
          needsCapabilityNamedIAM: true,
          needsCapabilityAutoExpand: true,
        });
      }
    });

    return [answers, tasks];
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()

    configBuilder
      .add(`CUSTOMDOMAIN_BASEPATH`, answers.notifications.customDomainBasePath)
      .add(`LOGGING_LEVEL`, answers.notifications.loggingLevel)
      .add(`CORS_ORIGIN`, answers.apigw.corsOrigin)

    return configBuilder.config;
  }


  public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
    const byOutputKey = await getStackOutputs(this.eventsProcessorStackName, answers.region)
    return {
      key: 'events_processor_base_url',
      value: byOutputKey('ApiGatewayUrl'),
      enabled: true
    }
  }

  public async generateLocalConfiguration(answers: Answers): Promise<string> {

    const byResourceLogicalId = await getStackResourceSummaries(this.eventsProcessorStackName, answers.region)

    const configBuilder = new ConfigBuilder()
      .add(`AWS_DYNAMODB_TABLES_EVENTCONFIG_NAME`, byResourceLogicalId('EventConfigTable'))
      .add(`AWS_DYNAMODB_TABLES_EVENTNOTIFICATIONS_NAME`, byResourceLogicalId('EventNotificationsTable'))
      .add(`AWS_IOT_ENDPOINT`, answers.iotEndpoint)
      .add(`AWS_LAMBDA_DYNAMODBSTREAM_NAME`, byResourceLogicalId('DynamoDBStreamLambdaFunction'))
      .add(`AWS_LAMBDA_LAMBDAINVOKE_ARN`, `arn:aws:iam::${answers.accountId}:role/${byResourceLogicalId('RESTLambdaExecutionRole')}`)
      .add(`EVENTSPROCESSOR_AWS_SQS_ASYNCPROCESSING`, byResourceLogicalId('AsyncProcessingQueue'))

    return configBuilder.config
  }

  public async delete(answers: Answers): Promise<ListrTask[]> {
    const tasks: ListrTask[] = [];
    tasks.push({
      title: `Deleting stack '${this.eventsAlertStackName}'`,
      task: async () => {
        await deleteStack(this.eventsAlertStackName, answers.region)

      }
    });
    tasks.push({
      title: `Deleting stack '${this.eventsProcessorStackName}'`,
      task: async () => {
        await deleteStack(this.eventsProcessorStackName, answers.region)
      }
    });
    return tasks

  }
}
