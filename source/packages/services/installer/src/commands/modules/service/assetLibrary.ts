import { Answers, AssetLibraryMode } from '../../../models/answers';
import { ListrTask } from 'listr2';
import { ModuleName, RestModule, PostmanEnvironment } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import inquirer from 'inquirer';
import ow from 'ow';
import execa from 'execa';
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, getStackOutputs, getStackParameters } from '../../../utils/cloudformation.util';
import { enableAutoScaling, provisionedConcurrentExecutions } from '../../../prompts/autoscaling.prompt';

export function modeRequiresNeptune(mode: string): boolean {
  return mode === AssetLibraryMode.Full || mode === AssetLibraryMode.Enhanced;
}

export function modeRequiresOpenSearch(mode: string): boolean {
  return mode === AssetLibraryMode.Enhanced;
}

export class AssetLibraryInstaller implements RestModule {

  public readonly friendlyName = 'Asset Library';
  public readonly name = 'assetLibrary';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'deploymentHelper',
  ];
  public readonly dependsOnOptional: ModuleName[] = ['vpc', 'authJwt'];
  private readonly applicationStackName: string;
  private readonly neptuneStackName: string;


  constructor(environment: string) {
    this.neptuneStackName = `cdf-assetlibrary-neptune-${environment}`
    this.applicationStackName = `cdf-assetlibrary-${environment}`
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.assetLibrary?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.applicationStackName),
    ], answers);
    if ((updatedAnswers.assetLibrary?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      {
        message: `Asset library mode: 'full' uses Amazon Neptune as data store. 'enhanced' adds Amazon OpenSearch for enhanced search features. 'lite' uses only AWS IoT Device Registry and supports a reduced feature set. See documentation for details.`,
        type: 'list',
        choices: [AssetLibraryMode.Full, AssetLibraryMode.Lite, AssetLibraryMode.Enhanced],
        name: 'assetLibrary.mode',
        default: answers.assetLibrary?.mode ?? AssetLibraryMode.Full,
        askAnswered: true,
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must enter the mode.';
          }
          return true;
        }
      },
      {
        message: `Select the Neptune database instance type:`,
        type: 'input',
        name: 'assetLibrary.neptuneDbInstanceType',
        default: answers.assetLibrary?.neptuneDbInstanceType ?? 'db.r4.xlarge',
        askAnswered: true,
        when(answers: Answers) {
          return modeRequiresNeptune(answers.assetLibrary?.mode);
        },
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must enter the Neptune DB Instance Type.';
          }
          return true;
        }
      },
      {
        message: `Create a Neptune read replica for multi-AZ?`,
        type: 'confirm',
        name: 'assetLibrary.createDbReplicaInstance',
        default: answers.assetLibrary?.createDbReplicaInstance ?? false,
        askAnswered: true,
        when(answers: Answers) {
          return modeRequiresNeptune(answers.assetLibrary?.mode);
        },
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must confirm whether to create a read replica.';
          }
          return true;
        },
      },
      {
        message: `Restore the Neptune database from a snapshot? If not, a fresh database will be created.`,
        type: 'confirm',
        name: 'assetLibrary.restoreFromSnapshot',
        default: answers.assetLibrary?.restoreFromSnapshot ?? false,
        askAnswered: true,
        when(answers: Answers) {
          return modeRequiresNeptune(answers.assetLibrary?.mode);
        },
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must confirm whether to restore from a snapshot or not.';
          }
          return true;
        },
      },
      {
        message: `Enter the Neptune database snapshot identifier:`,
        type: 'input',
        name: 'assetLibrary.neptuneSnapshotIdentifier',
        default: answers.assetLibrary?.neptuneSnapshotIdentifier,
        askAnswered: true,
        when(answers: Answers) {
          return modeRequiresNeptune(answers.assetLibrary?.mode) &&
            answers.assetLibrary?.restoreFromSnapshot;
        },
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must enter the Neptune DB Instance Identifier.';
          }
          return true;
        }
      },
      enableAutoScaling(this.name, answers),
      provisionedConcurrentExecutions(this.name, answers),
      ...applicationConfigurationPrompt(this.name, answers, [
        {
          question: 'Enable authorization?',
          propertyName: 'authorizationEnabled',
          defaultConfiguration: false,
        },
        {
          question: 'Enter Default Devices Parent Relationship name',
          propertyName: 'defaultDevicesParentRelationName',
          defaultConfiguration: 'parent'
        }, {
          question: 'Enter Default Devices Parent Path',
          propertyName: 'defaultDevicesParentPath',
          defaultConfiguration: '/unprovisioned'
        },
        {
          question: 'Enter Default Device State',
          propertyName: 'defaultDevicesState',
          defaultConfiguration: 'unprovisioned'
        },
        {
          question: 'Always validate against allowed parent path?',
          propertyName: 'defaultGroupsValidateAllowedParentPath',
          defaultConfiguration: false,
        },
        {
          question: 'Use Neptune DFE Query Engine for search?',
          propertyName: 'enableDfeOptimization',
          defaultConfiguration: false,
        }
      ]),
      ...customDomainPrompt(this.name, answers),
    ], updatedAnswers);

    return updatedAnswers;

  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.assetLibrary, ow.object.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.assetLibrary.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    if (modeRequiresNeptune(answers.assetLibrary.mode)) {
      tasks.push({
        title: `Deploying stack '${this.neptuneStackName}'`,
        task: async () => {

          const parameterOverrides = [
            `Environment=${answers.environment}`,
            `VpcId=${answers.vpc.id}`,
            `CDFSecurityGroupId=${answers.vpc.securityGroupId ?? ''}`,
            `PrivateSubNetIds=${answers.vpc.privateSubnetIds ?? ''}`,
            `CustomResourceVPCLambdaArn=${answers.deploymentHelper.vpcLambdaArn}`,
          ];

          const addIfSpecified = (key: string, value: unknown) => {
            if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
          };

          addIfSpecified('DbInstanceType', answers.assetLibrary.neptuneDbInstanceType);
          addIfSpecified('CreateDBReplicaInstance', answers.assetLibrary.createDbReplicaInstance);
          addIfSpecified('SnapshotIdentifier', answers.assetLibrary.neptuneSnapshotIdentifier);

          await execa('aws', ['cloudformation', 'deploy',
            '--template-file', '../assetlibrary/infrastructure/cfn-neptune.yaml',
            '--stack-name', this.neptuneStackName,
            '--parameter-overrides',
            ...parameterOverrides,
            '--capabilities', 'CAPABILITY_NAMED_IAM',
            '--no-fail-on-empty-changeset',
            '--region', answers.region
          ]);
        }
      });

      tasks.push({
        title: `Retrieving config from stack '${this.neptuneStackName}'`,
        task: async () => {
          const byOutputKey = await getStackOutputs(this.neptuneStackName, answers.region)
          answers.assetLibrary.neptuneUrl = byOutputKey('GremlinEndpoint');
        }
      });
    }


    tasks.push({
      title: `Packaging stack '${this.applicationStackName}'`,
      task: async () => {
        await execa('aws', ['cloudformation', 'package',
          '--template-file', '../assetlibrary/infrastructure/cfn-assetLibrary.yaml',
          '--output-template-file', '../assetlibrary/infrastructure/cfn-assetLibrary.yaml.build',
          '--s3-bucket', answers.s3.bucket,
          '--s3-prefix', 'cloudformation/artifacts/',
          '--region', answers.region
        ]);
      }
    });

    tasks.push({
      title: `Deploying stack '${this.applicationStackName}'`,
      task: async () => {

        const parameterOverrides = [
          `Environment=${answers.environment}`,
          `VpcId=${answers.vpc?.id ?? 'N/A'}`,
          `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
          `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
          `Mode=${answers.assetLibrary.mode}`,
          `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
          `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
          `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
          `AuthType=${answers.apigw.type}`
        ];

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('NeptuneURL', answers.assetLibrary.neptuneUrl);
        addIfSpecified('ApplyAutoscaling', answers.assetLibrary.enableAutoScaling);
        addIfSpecified('ProvisionedConcurrentExecutions', answers.assetLibrary.provisionedConcurrentExecutions);
        addIfSpecified('CustomResourceVPCLambdaArn', modeRequiresNeptune(answers.assetLibrary.mode) ?
          answers.deploymentHelper.vpcLambdaArn : answers.deploymentHelper.lambdaArn);
        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));


        await execa('aws', ['cloudformation', 'deploy',
          '--template-file', '../assetlibrary/infrastructure/cfn-assetLibrary.yaml.build',
          '--stack-name', this.applicationStackName,
          '--parameter-overrides',
          ...parameterOverrides,
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
      .add(`CUSTOMDOMAIN_BASEPATH`, answers.assetLibrary.customDomainBasePath)
      .add(`LOGGING_LEVEL`, answers.assetLibrary.loggingLevel)
      .add(`CORS_ORIGIN`, answers.apigw?.corsOrigin)
      .add(`DEFAULTS_DEVICES_PARENT_RELATION`, answers.assetLibrary?.defaultDevicesParentRelationName)
      .add(`DEFAULTS_DEVICES_PARENT_GROUPPATH`, answers.assetLibrary?.defaultDevicesParentPath)
      .add(`DEFAULTS_DEVICES_STATE`, answers.assetLibrary?.defaultDevicesState)
      .add(`DEFAULTS_GROUPS_VALIDATEALLOWEDPARENTPATHS`, answers.assetLibrary?.defaultGroupsValidateAllowedParentPath)
      .add(`ENABLE_DFE_OPTIMIZATION`, answers.assetLibrary?.enableDfeOptimization)
      .add(`AUTHORIZATION_ENABLED`, answers.assetLibrary?.authorizationEnabled)

    return configBuilder.config;
  }

  public async generateLocalConfiguration(answers: Answers): Promise<string> {

    const byOutputKey = await getStackOutputs(this.neptuneStackName, answers.region)
    const byParameterKey = await getStackParameters(this.applicationStackName, answers.region)

    const configBuilder = new ConfigBuilder()

    configBuilder
      .add(`AWS_NEPTUNE_URL`, byOutputKey('GremlinEndpoint'))
      .add(`MODE`, byParameterKey('Mode'))
      .add(`AWS_IOT_ENDPOINT`, answers.iotEndpoint)

    return configBuilder.config;
  }

  public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
    const byOutputKey = await getStackOutputs(this.applicationStackName, answers.region)
    return {
      key: 'assetlibrary_base_url',
      value: byOutputKey('ApiGatewayUrl'),
      enabled: true
    }
  }

  public async delete(answers: Answers): Promise<ListrTask[]> {
    const tasks: ListrTask[] = [];
    tasks.push({
      title: `Deleting stack '${this.applicationStackName}'`,
      task: async () => {
        await deleteStack(this.applicationStackName, answers.region)
      }
    });

    tasks.push({
      title: `Deleting stack '${this.neptuneStackName}'`,
      task: async () => {
        await deleteStack(this.neptuneStackName, answers.region)
      }
    });
    return tasks

  }
}
