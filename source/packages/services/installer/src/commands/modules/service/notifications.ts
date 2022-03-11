import { Answers } from '../../../models/answers';
import { ListrTask } from 'listr2';
import { ModuleName, RestModule, PostmanEnvironment } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import inquirer from 'inquirer';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import ow from 'ow';
import execa from 'execa';
import { deleteStack, getStackOutputs, getStackResourceSummaries } from '../../../utils/cloudformation.util';

export class NotificationsInstaller implements RestModule {

  public readonly friendlyName = 'Notifications';
  public readonly name = 'notifications';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'deploymentHelper',
    'kms',
  ];
  public readonly dependsOnOptional: ModuleName[] = ['vpc', 'authJwt'];
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
    if ((updatedAnswers.notifications?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      {
        message: 'Use DAX for DynamoDB caching',
        type: 'confirm',
        name: 'notifications.useDax',
        default: true,
        askAnswered: true
      },
      {
        message: `Select the DAX database instance type:`,
        type: 'input',
        name: 'notifications.daxInstanceType',
        default: answers.notifications?.daxInstanceType ?? 'dax.t2.medium',
        askAnswered: true,
        when(answers: Answers) {
          return answers.notifications?.useDax === true;
        },
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must enter the DAX Instance Type.';
          }
          return true;
        }
      },
      ...applicationConfigurationPrompt(this.name, answers, []),
      ...customDomainPrompt(this.name, answers),
    ], updatedAnswers);

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
      title: `Packaging stack '${this.eventsProcessorStackName}'`,
      task: async () => {
        await execa('aws', ['cloudformation', 'package',
          '--template-file', '../events-processor/infrastructure/cfn-eventsProcessor.yml',
          '--output-template-file', '../events-processor/infrastructure/cfn-eventsProcessor.yml.build',
          '--s3-bucket', answers.s3.bucket,
          '--s3-prefix', 'cloudformation/artifacts/',
          '--region', answers.region
        ]);
      }
    });

    tasks.push({
      title: `Deploying stack '${this.eventsProcessorStackName}'`,
      task: async () => {

        const parameterOverrides = [
          `Environment=${answers.environment}`,
          `VpcId=${answers.vpc?.id ?? 'N/A'}`,
          `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
          `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
          `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
          `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
          `AuthType=${answers.apigw.type}`,
          `KmsKeyId=${answers.kms.id}`,
          `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
          `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('DAXInstanceType', answers.notifications.daxInstanceType);
        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await execa('aws', ['cloudformation', 'deploy',
          '--template-file', '../events-processor/infrastructure/cfn-eventsProcessor.yml.build',
          '--stack-name', this.eventsProcessorStackName,
          '--parameter-overrides',
          ...parameterOverrides,
          '--capabilities', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND',
          '--no-fail-on-empty-changeset',
          '--region', answers.region
        ]);
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
      }
    });

    tasks.push({
      title: `Packaging stack '${this.eventsAlertStackName}'`,
      task: async () => {
        await execa('aws', ['cloudformation', 'package',
          '--template-file', '../events-alerts/infrastructure/cfn-eventsAlerts.yml',
          '--output-template-file', '../events-alerts/infrastructure/cfn-eventsAlerts.yml.build',
          '--s3-bucket', answers.s3.bucket,
          '--s3-prefix', 'cloudformation/artifacts/',
          '--region', answers.region
        ]);
      }
    });

    tasks.push({
      title: `Deploying stack '${this.eventsAlertStackName}'`,
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
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await execa('aws', ['cloudformation', 'deploy',
          '--template-file', '../events-alerts/infrastructure/cfn-eventsAlerts.yml.build',
          '--stack-name', this.eventsAlertStackName,
          '--parameter-overrides', ...parameterOverrides,
          '--capabilities', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND',
          '--no-fail-on-empty-changeset',
          '--region', answers.region
        ]);
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
