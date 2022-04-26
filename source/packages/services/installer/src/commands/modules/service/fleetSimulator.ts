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
import { deleteStack, getStackOutputs, getStackParameters, getStackResourceSummaries } from '../../../utils/cloudformation.util';


export class FleetSimulatorInstaller implements RestModule {

  public readonly friendlyName = 'Fleet Simulator';
  public readonly name = 'fleetSimulator';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'vpc',
    'kms',
    'deploymentHelper',
    'assetLibrary'
  ];
  public readonly dependsOnOptional: ModuleName[] = ['authJwt'];
  private readonly simulationLauncherStackName: string;
  private readonly simulationManagerStackName: string;
  private readonly assetLibraryStackName: string;

  constructor(environment: string) {
    this.simulationLauncherStackName = `cdf-simulation-launcher-${environment}`;
    this.simulationManagerStackName = `cdf-simulation-manager-${environment}`;
    this.assetLibraryStackName = `cdf-assetlibrary-${environment}`;
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.fleetSimulator?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, `cdf-simulation-launcher-${answers.environment}`),
    ], answers);
    if ((updatedAnswers.fleetSimulator?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      {
        message: `Enter the JMeter ECR repository name:`,
        type: 'input',
        name: 'fleetSimulator.jmeterRepoName',
        default: answers.fleetSimulator?.jmeterRepoName ?? 'jmeter',
        askAnswered: true,
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must enter the JMeter repo name.';
          }
          return true;
        }
      },

      ...applicationConfigurationPrompt(this.name, answers, [
        {
          defaultConfiguration: 'simulations/',
          question: 'The S3 key prefix where Simulation artifacts will be stored',
          propertyName: 's3Prefix'
        },
        {
          defaultConfiguration: '/opt/apache-jmeter-5.1.1/bin/cdf',
          question: 'Local location where to store jmeter execution results',
          propertyName: 'runnerDataDir'
        },
        {
          defaultConfiguration: 20,
          question: 'Number of concurrent threads jmeter can run',
          propertyName: 'runnerThreads'
        },
      ]),
      ...customDomainPrompt(this.name, answers),
    ], updatedAnswers);

    return updatedAnswers;
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.fleetSimulator, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.s3.bucket, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.fleetSimulator.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Packaging stack '${this.simulationLauncherStackName}'`,
      task: async () => {
        await execa('aws', ['cloudformation', 'package',
          '--template-file', '../simulation-launcher/infrastructure/cfn-simulation-launcher.yaml',
          '--output-template-file', '../simulation-launcher/infrastructure/cfn-simulation-launcher.yaml.build',
          '--s3-bucket', answers.s3.bucket,
          '--s3-prefix', 'cloudformation/artifacts/',
          '--region', answers.region
        ]);
      }
    });

    tasks.push({
      title: `Deploying stack '${this.simulationLauncherStackName}'`,
      task: async () => {
        const parameterOverrides = [
          `Environment=${answers.environment}`,
          `JmeterRepoName=${answers.fleetSimulator?.jmeterRepoName}`,
          `VpcId=${answers.vpc?.id}`,
          `PublicSubNetIds=${answers.vpc?.privateSubnetIds}`, // TODO:check how cfn uses this - should it be public or private subnets?
          `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
          `KmsKeyId=${answers.kms.id}`,
          `BucketName=${answers.s3.bucket}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await execa('aws', ['cloudformation', 'deploy',
          '--template-file', '../simulation-launcher/infrastructure/cfn-simulation-launcher.yaml.build',
          '--stack-name', this.simulationLauncherStackName,
          '--parameter-overrides',
          ...parameterOverrides,
          '--capabilities', 'CAPABILITY_NAMED_IAM',
          '--no-fail-on-empty-changeset',
          '--region', answers.region,
          '--tags', 'cdf_service=simulation-launcher', `cdf_environment=${answers.environment}`, ...answers.customTags.split(' '),
        ]);
      }
    });

    tasks.push({
      title: `Detecting environment config for stack '${this.simulationManagerStackName}'`,
      task: async () => {
        const assetlibrarybyResourceLogicalId = await getStackResourceSummaries(this.assetLibraryStackName, answers.region);
        const simulationLauncherbyResourceLogicalId = await getStackResourceSummaries(this.simulationLauncherStackName, answers.region)

        answers.fleetSimulator.assetLibraryFunctionName = assetlibrarybyResourceLogicalId('LambdaFunction');
        answers.fleetSimulator.snsTopic = simulationLauncherbyResourceLogicalId('SnsTopic');
      }
    });

    tasks.push({
      title: `Packaging stack '${this.simulationManagerStackName}'`,
      task: async () => {
        await execa('aws', ['cloudformation', 'package',
          '--template-file', '../simulation-manager/infrastructure/cfn-simulation-manager.yml',
          '--output-template-file', '../simulation-manager/infrastructure/cfn-simulation-manager.yml.build',
          '--s3-bucket', answers.s3.bucket,
          '--s3-prefix', 'cloudformation/artifacts/',
          '--region', answers.region,
          '--tags', 'cdf_service=simulation-manager', `cdf_environment=${answers.environment}`, ...answers.customTags.split(' '),
        ]);
      }
    });

    tasks.push({
      title: `Deploying stack '${this.simulationManagerStackName}'`,
      task: async () => {

        const parameterOverrides = [
          `Environment=${answers.environment}`,
          `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
          `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
          `AuthType=${answers.apigw.type}`,
          `VpcId=${answers.vpc?.id ?? 'N/A'}`,
          `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
          `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
          `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
          `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
          `BucketName=${answers.s3.bucket}`,
          `SimulationLauncherSnsTopic=${answers.fleetSimulator.snsTopic}`,
          `AssetLibraryFunctionName=${answers.fleetSimulator.assetLibraryFunctionName}`,
          `KmsKeyId=${answers.kms.id}`,

        ]

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await execa('aws', ['cloudformation', 'deploy',
          '--template-file', '../simulation-manager/infrastructure/cfn-simulation-manager.yml.build',
          '--stack-name', this.simulationManagerStackName,
          '--parameter-overrides', ...parameterOverrides,
          '--capabilities', 'CAPABILITY_NAMED_IAM',
          '--no-fail-on-empty-changeset',
          '--region', answers.region,
          '--tags', 'cdf_service=simulation-manager', `cdf_environment=${answers.environment}`, ...answers.customTags.split(' '),
        ]);
      }
    });

    return [answers, tasks];
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()
      .add(`CORS_ORIGIN`, answers.apigw.corsOrigin)
      .add(`CUSTOMDOMAIN_BASEPATH`, answers.fleetSimulator.customDomainBasePath)
      .add(`LOGGING_LEVEL`, answers.fleetSimulator.loggingLevel)
      .add(`RUNNERS_DATADIR`, answers.fleetSimulator.runnerDataDir)
      .add(`RUNNERS_THREADS`, answers.fleetSimulator.runnerThreads)
      .add(`AWS_S3_PREFIX`, answers.fleetSimulator.s3Prefix)
    return configBuilder.config;
  }

  public async generateLocalConfiguration(answers: Answers): Promise<string> {

    const byParameterKey = await getStackParameters(this.simulationManagerStackName, answers.region)
    const byResourceLogicalId = await getStackResourceSummaries(this.simulationManagerStackName, answers.region)

    const configBuilder = new ConfigBuilder()
      .add(`AWS_S3_BUCKET`, byParameterKey('BucketName'))
      .add(`ASSETLIBRARY_API_FUNCTION_NAME`, byParameterKey('AssetLibraryFunctionName'))
      .add(`AWS_DYNAMODB_TABLE_SIMULATIONS`, byResourceLogicalId('SimulationsTable'))
      .add(`AWS_DYNAMODB_TABLE_STATE`, byResourceLogicalId('SimulationDeviceState'))
      .add(`AWS_SNS_TOPICS_LAUNCH`, byResourceLogicalId('SimulationLauncherSnsTopic'))
      .add(`AWS_IOT_HOST`, answers?.iotEndpoint)

    return configBuilder.config
  }

  public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
    const byOutputKey = await getStackOutputs(this.simulationManagerStackName, answers.region)
    return {
      key: 'fleet_simulator_base_url',
      value: byOutputKey('ApiGatewayUrl'),
      enabled: true
    }
  }

  public async delete(answers: Answers): Promise<ListrTask[]> {
    const tasks: ListrTask[] = [];
    tasks.push({
      title: `Deleting stack '${this.simulationManagerStackName}'`,
      task: async () => {
        await deleteStack(this.simulationManagerStackName, answers.region)
      }
    });

    tasks.push({
      title: `Deleting stack '${this.simulationLauncherStackName}'`,
      task: async () => {
        await deleteStack(this.simulationLauncherStackName, answers.region)
      }
    });
    return tasks

  }
}
