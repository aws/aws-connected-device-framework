import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import { Answers } from '../../../models/answers';
import { ModuleName, PostmanEnvironment, RestModule } from '../../../models/modules';
import { applicationConfigurationPrompt } from '../../../prompts/applicationConfiguration.prompt';
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { chooseS3BucketPrompt } from '../../../prompts/s3.prompt';
import {
  deleteStack,
  getStackOutputs,
  getStackResourceSummaries,
  packageAndDeployStack,
  packageAndUploadTemplate,
} from '../../../utils/cloudformation.util';
import ow from 'ow';
import { ConfigBuilder } from '../../../utils/configBuilder';
import { DescribeRegionsCommand, EC2Client } from '@aws-sdk/client-ec2';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  NotFound,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import execa from 'execa';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';

export class OrganizationManagerInstaller implements RestModule {
  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = ['apigw', 'kms', 'eventBus'];
  public readonly localProjectDir = 'organization-manager';
  public readonly friendlyName = 'Organization Manager';
  public readonly name = 'organizationManager';

  public readonly dependsOnOptional: ModuleName[] = [];
  public readonly stackName: string;

  public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
    const byOutputKey = await getStackOutputs(this.stackName, answers.region);
    return {
      key: 'organizationmanager_base_url',
      value: byOutputKey('ApiGatewayUrl'),
      enabled: true,
    };
  }

  public async generateLocalConfiguration(answers: Answers): Promise<string> {
    const byResourceLogicalId = await getStackResourceSummaries(this.stackName, answers.region);
    const configBuilder = new ConfigBuilder().add(
      `AWS_DYNAMODB_ORGANIZATION_TABLE`,
      byResourceLogicalId('OrganizationManagerTable')
    );
    return configBuilder.config;
  }

  private async getAWSRegions(): Promise<string[]> {
    const ec2Client = new EC2Client({ region: 'us-east-1' });
    const describeRegionResponse = await ec2Client.send(new DescribeRegionsCommand({}));
    return describeRegionResponse.Regions.map((o) => o.RegionName);
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder();

    configBuilder
      .add(`CUSTOMDOMAIN_BASEPATH`, answers.organizationManager.customDomainBasePath)
      .add(`LOGGING_LEVEL`, answers.organizationManager.loggingLevel)
      .add(`CORS_ORIGIN`, answers.apigw?.corsOrigin)
      .add(`CONTROL_TOWER_MANIFEST_BUCKET`, answers.organizationManager?.controlTowerBucket)
      .add(`ENABLE_CREATE_OUS_FEATURE`, answers.organizationManager?.createOUsEnabled)
      .add(`ENABLE_DELETE_OUS_FEATURE`, answers.organizationManager?.deleteOUsEnabled)
      .add(`ENABLE_CREATE_ACCOUNTS_FEATURE`, answers.organizationManager?.createAccountsEnabled)
      .add(`ENABLE_DELETE_ACCOUNTS_FEATURE`, answers.organizationManager?.deleteAccountsEnabled)
      .add(`MANAGEMENT_ACCOUNT_ASSUME_ROLE`, answers.organizationManager?.managementAccountRole)
      .add(`SUSPENDED_OU`, answers.organizationManager?.suspendedOU);

    return configBuilder.config;
  }

  public async prompts(answers: Answers): Promise<Answers> {
    delete answers.organizationManager?.redeploy;

    let updatedAnswers: Answers = await inquirer.prompt(
      [redeployIfAlreadyExistsPrompt(this.name, this.stackName)],
      answers
    );

    if ((updatedAnswers.organizationManager?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    const allRegions = await this.getAWSRegions();

    updatedAnswers = await inquirer.prompt(
      [
        chooseS3BucketPrompt(
          'Provide the name of an existing S3 bucket used by control tower customization:',
          'organizationManager.controlTowerBucket',
          answers.organizationManager?.controlTowerBucket
        ),
        ...applicationConfigurationPrompt(this.name, answers, [
          {
            question: 'Enable delete ou(s) feature?',
            propertyName: 'createOUsEnabled',
            defaultConfiguration: false,
          },
          {
            question: 'Enable create ou(s) feature?',
            propertyName: 'deleteOUsEnabled',
            defaultConfiguration: false,
          },
          {
            question: 'Enable create account(s) feature?',
            propertyName: 'createAccountsEnabled',
            defaultConfiguration: false,
          },
          {
            question: 'Enable delete account(s) feature?',
            propertyName: 'deleteAccountsEnabled',
            defaultConfiguration: false,
          },
        ]),
        {
          message:
            'Select list of region supported by Organization Manager (this will be used to create an artifact bucket in the selected regions to store the artifacts referenced by CloudFormation StackSets multi region deployment):',
          type: 'checkbox',
          name: 'organizationManager.supportedRegions',
          choices: allRegions,
          default: answers.organizationManager?.supportedRegions,
          pageSize: 20,
          loop: false,
          askAnswered: true,
          validate(answer: string[]) {
            if (answer?.length === 0) {
              return 'You must choose at least one region to enable.';
            }
            return true;
          },
        },
        {
          message: `Enter the bucket prefix (this will be used when creating bucket in regions that are supported by Organization Manager):`,
          type: 'input',
          name: 'organizationManager.artifactBucketPrefix',
          default: answers.organizationManager?.artifactBucketPrefix,
          askAnswered: true,
          validate(answer: string) {
            if (answer?.length === 0) {
              return 'You must enter the bucket prefix.';
            }
            return true;
          },
        },
        {
          message: `Enter AWS Organization Id:`,
          type: 'input',
          name: 'organizationManager.organizationId',
          default: answers.organizationManager?.organizationId,
          askAnswered: true,
          validate(answer: string) {
            if (answer?.length === 0) {
              return 'You must enter the AWS Organization Id.';
            }
            return true;
          },
        },
        ...customDomainPrompt(this.name, answers),
        {
          message: `Enter the IAM role that can be assumed from Management Account:`,
          type: 'input',
          name: 'organizationManager.managementAccountRole',
          default: answers.organizationManager?.managementAccountRole,
          askAnswered: true,
          when(answers: Answers) {
            return (
              answers.organizationManager.deleteAccountsEnabled ||
              answers.organizationManager.createAccountsEnabled ||
              answers.organizationManager.deleteOUsEnabled ||
              answers.organizationManager.createOUsEnabled
            );
          },
          validate(answer: string) {
            if (answer?.length === 0) {
              return 'You must enter the IAM role.';
            }
            return true;
          },
        },
        {
          message: `Enter OU for suspended account:`,
          type: 'input',
          name: 'organizationManager.suspendedOu',
          default: answers.organizationManager?.suspendedOU,
          askAnswered: true,
          when(answers: Answers) {
            return answers.organizationManager.deleteAccountsEnabled;
          },
          validate(answer: string) {
            if (answer?.length === 0) {
              return 'You must enter the OU for suspended account.';
            }
            return true;
          },
        },
      ],
      updatedAnswers
    );

    return updatedAnswers;
  }

  constructor(environment: string) {
    this.stackName = `cdf-organization-manager-${environment}`;
  }

  private getParameterOverrides(answers: Answers): string[] {
    const parameterOverrides = [
      `Environment=${answers.environment}`,
      `AuthType=${answers.apigw.type}`,
      `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
      `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
      `KmsKeyId=${answers.kms.id}`,
      `ControlPlaneBusName=${answers.eventBus.arn}`,
      `BucketName=${answers.organizationManager.controlTowerBucket}`,
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
    const tasks: ListrTask[] = [
      {
        title: `Packaging module '${this.name}'`,
        task: async () => {
          await packageAndUploadTemplate({
            answers: answers,
            serviceName: 'organization-manager',
            templateFile: '../organization-manager/infrastructure/cfn-organizationmanager.yml',
            parameterOverrides: this.getParameterOverrides(answers),
          });
        },
      },
    ];
    return [answers, tasks];
  }

  public async createBucketAndApplyPolicy(
    bucketPrefix: string,
    region: string,
    organizationId: string
  ) {
    const s3 = new S3Client({ region });
    const bucketName = `${bucketPrefix}-${region}`;
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (error) {
      if (error instanceof NotFound) {
        await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
      } else {
        throw error;
      }
    }

    const policyToApply = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject', 's3:PutObject'],
          Condition: { StringEquals: { 'aws:PrincipalOrgID': organizationId } },
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
      ],
    };

    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policyToApply),
      })
    );
  }

  private async uploadSampleTemplates(
    controlPlaneRegion: string,
    bucketPrefix: string,
    supportedRegions: string[]
  ): Promise<void> {
    const monorepoRoot = await getMonorepoRoot();
    const regions = supportedRegions.join(' ');
    const controlPlaneBucket = `${bucketPrefix}-${controlPlaneRegion}`;
    const cmdOptions = { cwd: monorepoRoot };
    const initialSampleVersion = '0.0.1';
    await execa(
      'multi-accounts/deploy-assets-multiple-region.bash',
      [
        '-b',
        controlPlaneBucket,
        '-r',
        regions,
        '-p',
        bucketPrefix,
        '-v',
        initialSampleVersion,
        '-R',
        controlPlaneRegion,
      ],
      cmdOptions
    );
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {
    ow(answers, ow.object.plain);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.region, ow.string.nonEmpty);
    ow(answers.organizationManager.controlTowerBucket, ow.string.nonEmpty);
    ow(answers.apigw.type, ow.string.nonEmpty);
    ow(answers.apigw.templateSnippetS3UriBase, ow.string.nonEmpty);
    ow(answers.apigw.cloudFormationTemplate, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.organizationManager.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push(
      {
        title: `Creating artifact bucket for '${this.stackName}'`,
        task: async () => {
          const { organizationId, artifactBucketPrefix } = answers.organizationManager;
          const createBucketPromises = answers.organizationManager.supportedRegions.map(
            (region) => {
              return this.createBucketAndApplyPolicy(artifactBucketPrefix, region, organizationId);
            }
          );
          await Promise.all(createBucketPromises);
        },
      },
      {
        title: `Uploading sample templates to buckets in supported regions`,
        task: async () => {
          const { artifactBucketPrefix, supportedRegions } = answers.organizationManager;
          await this.uploadSampleTemplates(answers.region, artifactBucketPrefix, supportedRegions);
        },
      },
      {
        title: `Packaging and deploying stack '${this.stackName}'`,
        task: async () => {
          await packageAndDeployStack({
            answers: answers,
            stackName: this.stackName,
            serviceName: 'organization-manager',
            templateFile: '../organization-manager/infrastructure/cfn-organizationmanager.yml',
            parameterOverrides: this.getParameterOverrides(answers),
            needsPackaging: true,
            needsCapabilityNamedIAM: true,
            needsCapabilityAutoExpand: true,
          });
        },
      }
    );

    return [answers, tasks];
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
