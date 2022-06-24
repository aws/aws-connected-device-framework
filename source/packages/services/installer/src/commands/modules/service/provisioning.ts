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
import { Answers, CAAliases } from '../../../models/answers';
import { RestModule, ModuleName, PostmanEnvironment } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import ow from 'ow';
import { deleteStack, getStackOutputs, getStackParameters, getStackResourceSummaries, packageAndDeployStack, packageAndUploadTemplate } from '../../../utils/cloudformation.util';
import { Lambda } from '@aws-sdk/client-lambda';
export class ProvisioningInstaller implements RestModule {

  public readonly friendlyName = 'Provisioning';
  public readonly name = 'provisioning';
  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'kms',
    'openSsl',
    'deploymentHelper',
  ];

  public readonly dependsOnOptional: ModuleName[] = [];

  private readonly stackName: string

  constructor(environment: string) {
    this.stackName = `cdf-provisioning-${environment}`;
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.provisioning?.redeploy;

    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);

    if ((updatedAnswers.provisioning?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    if (updatedAnswers.provisioning === undefined) {
      updatedAnswers.provisioning = {};
    }

    const pcaAliases = await this.getAliases(answers);
    updatedAnswers.provisioning.pcaAliases = pcaAliases;

    // eslint-disable-next-line
    const _ = this;

    updatedAnswers = await inquirer.prompt([
      {
        message: `If using ACM PCA, and ACM PCA is located in another AWS Account, enter the IAM cross-account role (leave blank otherwise)`,
        type: 'input',
        name: 'provisioning.pcaCrossAccountRoleArn',
        default: answers.provisioning?.pcaCrossAccountRoleArn ?? '',
        askAnswered: true,
        validate(answer: string) {
          if (answer?.length === 0) {
            return true;
          }
          return _.validateAcmPcaArn(answer);
        },
      },
      {
        message: `Create or modify ACM PCA alias list (optional) ?`,
        type: 'confirm',
        name: 'provisioning.setPcaAliases',
        default: answers.provisioning?.setPcaAliases ?? true,
        askAnswered: true
      },
      {
        message: 'Select the ACM PCA aliases you wish to modify',
        type: 'list',
        name: 'provisioning.pcaAlias',
        choices: pcaAliases.list,
        pageSize: 20,
        loop: false,
        askAnswered: true,
        default: pcaAliases.list.length - 1,
        validate(answer: string[]) {
          if (answer?.length === 0) {
            return false;
          }
          return true;
        },
        when(answers: Answers) {
          return answers.provisioning?.setPcaAliases === true && pcaAliases.list?.length > 1;
        }
      },
      {
        message: `No ACM PCA alias was found. Create a new alias ?`,
        type: 'confirm',
        name: 'provisioning.setPcaAliases',
        default: answers.provisioning?.setPcaAliases ?? true,
        askAnswered: true,
        when(answers: Answers) {
          return answers.provisioning?.setPcaAliases === true && pcaAliases.list?.length === 1;
        },
      },
      {
        message: `Enter new ACM PCA alias name:`,
        type: 'input',
        name: 'provisioning.pcaAlias',
        default: answers.provisioning?.pcaAlias,
        askAnswered: true,
        validate(answer: string[]) {
          if (answer?.length === 0) {
            return false;
          }
          return true;
        },
        when(answers: Answers) {
          return answers.provisioning?.setPcaAliases === true && (answers.provisioning.pcaAliases.list?.length === 1 || answers.provisioning.pcaAlias === "Create New PCA alias");
        },
      },
      {
        message: `ACM PCA ARN:`,
        type: 'input',
        name: 'provisioning.pcaArn',
        default: answers.provisioning?.pcaArn,
        askAnswered: true,
        validate(answer: string) {
          return _.validateAcmPcaArn(answer);
        },
        when(answers: Answers) {
          return answers.provisioning?.setPcaAliases === true;
        },
      },

      ...customDomainPrompt(this.name, answers),
      ...applicationConfigurationPrompt(this.name, answers, [
        {
          question: 'Allow service to delete AWS IoT Certificates ?',
          defaultConfiguration: false,
          propertyName: 'deleteCertificates',
        },
        {
          question: 'Allow service to delete AWS IoT Policies ?',
          defaultConfiguration: false,
          propertyName: 'deletePolicies',
        },
        {
          question: 'Certificate expiry in days ?',
          defaultConfiguration: 365,
          propertyName: 'certificateExpiryInDays',
        },
        {
          question: 'The S3 key suffix where templates are stored ?',
          defaultConfiguration: '.json',
          propertyName: 'templateSuffix',
        },
        {
          question: 'The S3 key prefix where templates are stored ?',
          defaultConfiguration: 'templates/',
          propertyName: 'templatesPrefix',
        },
        {
          question: 'The S3 key prefix where bulk requests are stored ?',
          defaultConfiguration: 'bullkrequests/',
          propertyName: 'bulkRequestsPrefix',
        },

      ])], updatedAnswers);

    return updatedAnswers;
  }

  private getParameterOverrides(answers: Answers): string[] {
    const parameterOverrides = [
      `Environment=${answers.environment}`,
      `AuthType=${answers.apigw.type}`,
      `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
      `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
      `VpcId=${answers.vpc?.id ?? 'N/A'}`,
      `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
      `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
      `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
      `KmsKeyId=${answers.kms.id}`,
      `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
      `BucketName=${answers.s3.bucket}`,
      `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
    ];

    const addIfSpecified = (key: string, value: unknown) => {
      if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
    };

    addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
    addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
    addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));
    addIfSpecified('ACMPCACrossAccountRoleArn', answers.provisioning.pcaCrossAccountRoleArn);

    return parameterOverrides;
  }

  public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
    const tasks: ListrTask[] = [{
      title: `Packaging module '${this.name}'`,
      task: async () => {
        await packageAndUploadTemplate({
          answers: answers,
          serviceName: 'provisioning',
          templateFile: '../provisioning/infrastructure/cfn-provisioning.yml',
          parameterOverrides: this.getParameterOverrides(answers)
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

    if ((answers.provisioning.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Packaging stack '${this.stackName}'`,
      task: async () => {

        // If list is undefined it could be that we're deploying without prompt
        if (answers.provisioning?.pcaAliases === undefined) {
          answers.provisioning.pcaAliases = await this.getAliases(answers)
        }

        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'provisioning',
          templateFile: '../provisioning/infrastructure/cfn-provisioning.yml',
          parameterOverrides: this.getParameterOverrides(answers),
          needsPackaging: true,
          needsCapabilityNamedIAM: true,
        });
      }
    });

    return [answers, tasks];
  }

  public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
    const byOutputKey = await getStackOutputs(this.stackName, answers.region)
    return {
      key: 'provisioning_base_url',
      value: byOutputKey('ApiGatewayUrl'),
      enabled: true
    }
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()

    if (answers.provisioning.setPcaAliases) {
      if (!answers.provisioning.pcaAliases.list.includes(answers.provisioning.pcaAlias)) {
        answers.provisioning.pcaAliases.cas.push({ alias: answers.provisioning.pcaAlias, value: answers.provisioning.pcaArn });
      }
    }

    answers.provisioning.pcaAliases.cas.forEach(pca => {
      let alias = pca.alias;
      if (!pca.alias.startsWith('PCA_')) {
        alias = `PCA_${pca.alias.toUpperCase()}`;
      }
      if (alias == answers.provisioning.pcaAlias) {
        pca.value = answers.provisioning.pcaArn;
      }
      configBuilder.add(alias, pca.value);
    });

    configBuilder
      .add(`AWS_S3_BULKREQUESTS_PREFIX`, answers.provisioning.bulkRequestsPrefix)
      .add(`AWS_S3_TEMPLATES_PREFIX`, answers.provisioning.templatesPrefix)
      .add(`AWS_S3_TEMPLATES_SUFFIX`, answers.provisioning.templateSuffix)
      .add(`CORS_ORIGIN`, answers.apigw.corsOrigin)
      .add(`CUSTOMDOMAIN_BASEPATH`, answers.provisioning.customDomainBasePath)
      .add(`DEVICE_CERTIFICATE_EXPIRY_DAYS`, answers.provisioning.certificateExpiryInDays)
      .add(`FEATURES_DELETE_CERTIFICATES`, answers.provisioning.deleteCertificates)
      .add(`FEATURES_DELETE_POLICIES`, answers.provisioning.deletePolicies)
      .add(`LOGGING_LEVEL`, answers.provisioning.loggingLevel);

    return configBuilder.config;
  }


  public async generateLocalConfiguration(answers: Answers): Promise<string> {
    const byParameterKey = await getStackParameters(this.stackName, answers.region)
    const byResourceLogicalId = await getStackResourceSummaries(this.stackName, answers.region)

    const configBuilder = new ConfigBuilder()
      .add(`AWS_S3_ROLE_ARN`, `arn:aws:iam::${answers.accountId}:role/${byResourceLogicalId('LambdaExecutionRole')}`)
      .add(`AWS_S3_TEMPLATES_BUCKET`, byParameterKey('BucketName'))
      .add(`AWS_S3_BULKREQUESTS_BUCKET`, byParameterKey('BucketName'))
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

  private async getAliases(answers: Answers): Promise<CAAliases> {
    const lambda = new Lambda({ region: answers.region });
    let aliases: CAAliases;

    if (answers?.provisioning?.pcaAliases === undefined) {
      aliases = { list: [], cas: [] };
    } else {
      aliases = answers.provisioning.pcaAliases;
      aliases.list = aliases.cas?.map(ca => ca.alias) ?? [];
    }

    // append lambda suppliers if none are present in the config
    try {
      const config = await lambda.getFunctionConfiguration({ FunctionName: `cdf-provisioning-rest-${answers.environment}` });
      const variables = config.Environment?.Variables;
      const appConfigStr = variables['APP_CONFIG'] as string;
      appConfigStr.split('\r\n').forEach(element => {
        if (element.startsWith('PCA_')) {
          const [key, value] = element.split('=');
          const alias = key.replace('PCA_', '');

          if (!aliases.list.includes(alias)) {
            aliases.list.push(alias);
            aliases.cas.push({ alias, value });
          }
        }
      });
    } catch (e) {
      e.name === 'ResourceNotFoundException' && console.log(`No suppliers found`);
    }
    if (aliases.list.length == 0 || !aliases.list.includes("Create New Alias")) {
      aliases.list.push("Create New Alias");
    }
    return aliases;

  }

  private validateAcmPcaArn(arn: string): boolean {
    return /^arn:aws:acm-pca:\w+(?:-\w+)+:\d{12}:certificate-authority\/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+$/.test(arn);
  }

}