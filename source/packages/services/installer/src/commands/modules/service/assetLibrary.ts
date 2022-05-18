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
import { ConfigBuilder } from '../../../utils/configBuilder';
import inquirer from 'inquirer';
import ow from 'ow';
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from '../../../prompts/applicationConfiguration.prompt';
import { deleteStack, getStackOutputs, getStackParameters, packageAndDeployStack, packageAndUploadTemplate } from '../../../utils/cloudformation.util';
import { enableAutoScaling, provisionedConcurrentExecutions } from '../../../prompts/autoscaling.prompt';
import { getNeptuneInstancetypeList } from '../../../utils/instancetypes';
import { includeOptionalModule } from '../../../utils/modules.util';

// CDF does not specify a Neptune engine version in its Cloudformation templates. When updating a CDF
// deployment, the existing Neptune engine version remains unchanged, for new deployments the Neptune
// service default applies. For rendering a list of available Neptune instance types, however, some
// recent Neptune engine version number must be assumed or else obsolete old versions are included in
// the response from the AWS.RDS.DescribeOrderableDBInstanceOptions API.
const ASSUMED_NEPTUNE_ENGINE_VERSION = '1.1.0.0';
// This value is ignored if it is not included in the list of instance types returned by the
// AWS.RDS.DescribeOrderableDBInstanceOptions API.
const DEFAULT_NEPTUNE_INSTANCE_TYPE = 'db.r5.xlarge';

export class AssetLibraryInstaller implements RestModule {

  public readonly friendlyName = 'Asset Library';
  public readonly name = 'assetLibrary';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'deploymentHelper',
  ];
  public readonly dependsOnOptional: ModuleName[] = ['vpc'];
  private readonly applicationStackName: string;
  private readonly neptuneStackName: string;

  constructor(environment: string) {
    this.neptuneStackName = `cdf-assetlibrary-neptune-${environment}`
    this.applicationStackName = `cdf-assetlibrary-${environment}`
  }
  includeOptionalModules: (answers: Answers) => Answers;

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.assetLibrary?.redeploy;

    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.applicationStackName),
    ], answers);

    if ((updatedAnswers.assetLibrary?.redeploy ?? true)) {
      const neptuneInstanceTypes = await getNeptuneInstancetypeList(
        answers.region,
        ASSUMED_NEPTUNE_ENGINE_VERSION
      );

      updatedAnswers = await inquirer.prompt([
        {
          message: `Run in 'full' mode (with Amazon Neptune), or 'lite' mode (using AWS IoT Device Registry only). Note that 'lite' mode supports a reduced set of Asset Library features (see documentation for further info).`,
          type: 'list',
          choices: ['full', 'lite'],
          name: 'assetLibrary.mode',
          default: answers.assetLibrary?.mode ?? 'full',
          askAnswered: true,
          validate(answer: string) {
            if (answer?.length === 0) {
              return 'You must enter the mode.';
            }
            return true;
          }
        },
        {
          message: `${(neptuneInstanceTypes.length > 0) ? "Select" : "Enter"} the Neptune database instance type:`,
          type: (neptuneInstanceTypes.length > 0) ? 'list' : 'input',
          choices: neptuneInstanceTypes,
          name: 'assetLibrary.neptuneDbInstanceType',
          default: (
            answers.assetLibrary?.neptuneDbInstanceType ??
              (neptuneInstanceTypes.indexOf(DEFAULT_NEPTUNE_INSTANCE_TYPE) >= 0)
              ? DEFAULT_NEPTUNE_INSTANCE_TYPE
              : undefined
          ),
          askAnswered: true,
          loop: false,
          pageSize: 10,
          when(answers: Answers) {
            return answers.assetLibrary?.mode === 'full';
          },
          validate(answer: string) {
            if (neptuneInstanceTypes.length > 0 && !neptuneInstanceTypes.includes(answer)) {
              return `Neptune DB Instance Type must be one of: ${neptuneInstanceTypes.join(', ')}`;
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
            return answers.assetLibrary?.mode === 'full';
          },
          validate(answer: string) {
            if (answer?.length === 0) {
              return 'You must confirm whether to create a read replica.';
            }
            return true;
          },
        },
        {
          message: `Restore the database from a snapshot? If not, a fresh database will be created.`,
          type: 'confirm',
          name: 'assetLibrary.restoreFromSnapshot',
          default: answers.assetLibrary?.restoreFromSnapshot ?? false,
          askAnswered: true,
          when(answers: Answers) {
            return answers.assetLibrary?.mode === 'full';
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
            return answers.assetLibrary?.mode === 'full' &&
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
    }

    includeOptionalModule('vpc', updatedAnswers.modules, updatedAnswers.assetLibrary.mode === 'full')
    return updatedAnswers;
  }

  public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
    const tasks: ListrTask[] = [{
      title: `Packaging module '${this.name} [Neptune]'`,
      task: async () => {
        await packageAndUploadTemplate({
          answers: answers,
          templateFile: '../assetlibrary/infrastructure/cfn-neptune.yaml',
          needsPackaging: false
        });
      },
    },
    {
      title: `Packaging module '${this.name} [Application]'`,
      task: async () => {
        await packageAndUploadTemplate({
          answers: answers,
          templateFile: '../assetlibrary/infrastructure/cfn-assetLibrary.yaml',
        });
      },
    }];
    return [answers, tasks]
  }


  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {
    const tasks: ListrTask[] = [];

    ow(answers, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.assetLibrary, ow.object.nonEmpty);

    if ((answers.assetLibrary.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    if (answers.assetLibrary.mode === 'full') {
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

          await packageAndDeployStack({
            answers: answers,
            stackName: this.neptuneStackName,
            serviceName: 'assetlibrary',
            templateFile: '../assetlibrary/infrastructure/cfn-neptune.yaml',
            parameterOverrides,
            needsCapabilityNamedIAM: true,
          })
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
      title: `Packaging and deploying stack '${this.applicationStackName}'`,
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
        addIfSpecified('CustomResourceVPCLambdaArn', answers.assetLibrary.mode === 'full' ?
          answers.deploymentHelper.vpcLambdaArn : answers.deploymentHelper.lambdaArn);
        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await packageAndDeployStack({
          answers: answers,
          stackName: this.applicationStackName,
          serviceName: 'assetlibrary',
          templateFile: '../assetlibrary/infrastructure/cfn-assetLibrary.yaml',
          parameterOverrides,
          needsPackaging: true,
          needsCapabilityNamedIAM: true,
          needsCapabilityAutoExpand: true,
        });
      },
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
