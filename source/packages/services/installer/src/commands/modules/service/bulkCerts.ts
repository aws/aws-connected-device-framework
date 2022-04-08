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
import ow from 'ow';
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, getStackOutputs, getStackParameters, getStackResourceSummaries, packageAndDeployStack } from '../../../utils/cloudformation.util';

export class BulkCertificatesInstaller implements RestModule {

  public readonly friendlyName = 'Bulk Certificates';
  public readonly name = 'bulkCerts';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'kms',
    'openSsl'];

    public readonly dependsOnOptional: ModuleName[] = [];

  private readonly stackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-bulkcerts-${environment}`
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.bulkCerts?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);
    if ((updatedAnswers.bulkCerts?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      {
        message: 'Would you like to provide any default values for the device certificates?',
        type: 'confirm',
        name: 'bulkCerts.setCertificateDefaults',
        default: answers.bulkCerts?.setCertificateDefaults ?? true,
        askAnswered: true,
      },
      {
        message: `Default certificate common name (leave blank to skip):`,
        type: 'input',
        name: 'bulkCerts.commonName',
        default: answers.bulkCerts?.commonName,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setCertificateDefaults === true;
        },
      },
      {
        message: `Default certificate organization (leave blank to skip):`,
        type: 'input',
        name: 'bulkCerts.organization',
        default: answers.bulkCerts?.organization,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setCertificateDefaults === true;
        },
      },
      {
        message: `Default certificate organizational unit (leave blank to skip):`,
        type: 'input',
        name: 'bulkCerts.organizationalUnit',
        default: answers.bulkCerts?.organizationalUnit,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setCertificateDefaults === true;
        },
      },
      {
        message: `Default certificate locality (leave blank to skip):`,
        type: 'input',
        name: 'bulkCerts.locality',
        default: answers.bulkCerts?.locality,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setCertificateDefaults === true;
        },
      },
      {
        message: `Default certificate state name (leave blank to skip):`,
        type: 'input',
        name: 'bulkCerts.stateName',
        default: answers.bulkCerts?.stateName,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setCertificateDefaults === true;
        },
      },
      {
        message: `Default certificate country (leave blank to skip):`,
        type: 'input',
        name: 'bulkCerts.country',
        default: answers.bulkCerts?.country,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setCertificateDefaults === true;
        },
      },
      {
        message: `Default certificate email address (leave blank to skip):`,
        type: 'input',
        name: 'bulkCerts.emailAddress',
        default: answers.bulkCerts?.emailAddress,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setCertificateDefaults === true;
        },
      },
      {
        message: `Default certificate distinguished name identifier (leave blank to skip):`,
        type: 'input',
        name: 'bulkCerts.distinguishedNameIdentifier',
        default: answers.bulkCerts?.distinguishedNameIdentifier,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setCertificateDefaults === true;
        },
      },
      ...applicationConfigurationPrompt(this.name, answers, [
        {
          question: 'Default certificate expiry days (leave blank to skip):',
          defaultConfiguration: 365,
          propertyName: 'expiryDays'
        },
        {
          question: 'The chunk size that the number of requested certificates are split into',
          defaultConfiguration: 100,
          propertyName: 'chunksize'
        }]),
      ...customDomainPrompt(this.name, answers),
    ], updatedAnswers);

    return updatedAnswers;


  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.apigw, ow.object.nonEmpty);
    ow(answers.bulkCerts, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.region, ow.string.nonEmpty);
    ow(answers.openSsl?.arn, ow.string.nonEmpty);
    ow(answers.s3?.bucket, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.bulkCerts.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Packaging and deploying stack '${this.stackName}'`,
      task: async () => {

        const parameterOverrides = [
          `Environment=${answers.environment}`,
          `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
          `AuthType=${answers.apigw.type}`,
          `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
          `VpcId=${answers.vpc?.id ?? 'N/A'}`,
          `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
          `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
          `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
          `KmsKeyId=${answers.kms.id}`,
          `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
          `BucketName=${answers.s3.bucket}`,
          `BucketKeyPrefix=certificates/`,
        ]

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'bulkcerts',
          templateFile: '../bulkcerts/infrastructure/cfn-bulkcerts.yml',
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
        key: 'bulkcerts_base_url',
        value: byOutputKey('ApiGatewayUrl'),
        enabled: true
      }
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()

    configBuilder
      .add(`CUSTOMDOMAIN_BASEPATH`, answers.bulkCerts.customDomainBasePath)
      .add(`LOGGING_LEVEL`, answers.bulkCerts.loggingLevel)
      .add(`CORS_ORIGIN`, answers.apigw.corsOrigin)
      .add(`CERTIFICATE_DEFAULT_COMMONNAME`, answers.bulkCerts.commonName)
      .add(`CERTIFICATE_DEFAULT_ORGANIZATION`, answers.bulkCerts.organization)
      .add(`CERTIFICATE_DEFAULT_ORGANIZATIONALUNIT`, answers.bulkCerts.organizationalUnit)
      .add(`CERTIFICATE_DEFAULT_LOCALITY`, answers.bulkCerts.locality)
      .add(`CERTIFICATE_DEFAULT_STATENAME`, answers.bulkCerts.stateName)
      .add(`CERTIFICATE_DEFAULT_COUNTRY`, answers.bulkCerts.country)
      .add(`CERTIFICATE_DEFAULT_EMAILADDRESS`, answers.bulkCerts.emailAddress)
      .add(`CERTIFICATE_DEFAULT_DISTINGUISHEDNAMEQUALIFIER`, answers.bulkCerts.distinguishedNameIdentifier)
      .add(`CERTIFICATE_DEFAULT_EXPIRYDAYS`, answers.bulkCerts.expiryDays)
      .add(`DEFAULTS_CHUNKSIZE`, answers.bulkCerts.chunksize)

    return configBuilder.config;
  }


  public async generateLocalConfiguration(answers: Answers): Promise<string> {
    const byParameterKey = await getStackParameters(this.stackName, answers.region)
    const byResourceLogicalId = await getStackResourceSummaries(this.stackName, answers.region)

    const configBuilder = new ConfigBuilder()

    configBuilder
      .add(`AWS_DYNAMODB_TASKS_TABLENAME`, byResourceLogicalId('BulkCertificatesTaskTable'))
      .add(`AWS_S3_CERTIFICATES_BUCKET`, byParameterKey('BucketName'))
      .add(`AWS_S3_CERTIFICATES_PREFIX`, byParameterKey('BucketKeyPrefix'))
      .add(`EVENTS_REQUEST_TOPIC`, byResourceLogicalId('CertificatesRequestSnsTopic'))

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
