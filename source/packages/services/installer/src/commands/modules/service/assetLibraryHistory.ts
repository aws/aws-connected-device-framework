import { Answers } from '../../../models/answers';
import { ListrTask } from 'listr2';
import { ModuleName, RestModule, PostmanEnvironment } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import ow from 'ow';
import execa from 'execa';
import inquirer from 'inquirer';
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";

import { deleteStack, getStackOutputs, getStackResourceSummaries } from '../../../utils/cloudformation.util';

export class AssetLibraryHistoryInstaller implements RestModule {

  public readonly friendlyName = 'Asset Library History';
  public readonly name = 'assetLibraryHistory';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'deploymentHelper',
    'kms'
  ];
  public readonly dependsOnOptional: ModuleName[] = ['vpc', 'authJwt'];
  private readonly stackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-assetlibraryhistory-${environment}`
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.assetLibraryHistory?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);
    if ((updatedAnswers.assetLibraryHistory?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      ...applicationConfigurationPrompt(this.name, answers, []),
      ...customDomainPrompt(this.name, answers),
    ], updatedAnswers);

    return updatedAnswers;

  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.assetLibraryHistory, ow.object.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.assetLibraryHistory.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Packaging stack '${this.stackName}'`,
      task: async () => {
        await execa('aws', ['cloudformation', 'package',
          '--template-file', '../assetlibraryhistory/infrastructure/cfn-assetLibraryHistory.yml',
          '--output-template-file', '../assetlibraryhistory/infrastructure/cfn-assetLibraryHistory.yml.build',
          '--s3-bucket', answers.s3.bucket,
          '--s3-prefix', 'cloudformation/artifacts/',
          '--region', answers.region
        ]);
      }
    });

    tasks.push({
      title: `Deploying stack '${this.stackName}'`,
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
        ];

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await execa('aws', ['cloudformation', 'deploy',
          '--template-file', '../assetlibraryhistory/infrastructure/cfn-assetLibraryHistory.yml.build',
          '--stack-name', this.stackName,
          '--parameter-overrides',
          ...parameterOverrides,
          '--capabilities', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND',
          '--no-fail-on-empty-changeset',
          '--region', answers.region,
          '--tags', 'cdf_service=assetlibrary-history', `cdf_environment=${answers.environment}`, ...answers.customTags.split(' '),
        ]);
      }
    });

    return [answers, tasks];
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()
    configBuilder
      .add(`CUSTOMDOMAIN_BASEPATH`, answers.assetLibraryHistory.customDomainBasePath)
      .add(`LOGGING_LEVEL`, answers.assetLibraryHistory.loggingLevel)
      .add(`CORS_ORIGIN`, answers.apigw.corsOrigin)

    return configBuilder.config;
  }

  public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
    const byOutputKey = await getStackOutputs(this.stackName, answers.region)
    return {
      key: 'assetlibraryhistory_base_url',
      value: byOutputKey('ApiGatewayUrl'),
      enabled: true
    }
  }

  public async generateLocalConfiguration(answers: Answers): Promise<string> {
    const byResourceKey = await getStackResourceSummaries(this.stackName, answers.region)
    const configBuilder = new ConfigBuilder()
    configBuilder
      .add(`AWS_DYNAMODB_TABLES_EVENTS`, byResourceKey('HistoryTable'))
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
