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
import ow from 'ow';
import inquirer from 'inquirer';
import path from 'path';
import { ListrTask } from 'listr2';
import { Answers } from '../../../models/answers';
import { ModuleName, ServiceModule } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, getStackResourceSummaries, packageAndDeployStack, packageAndUploadTemplate } from '../../../utils/cloudformation.util';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';

export class CertificateVendorInstaller implements ServiceModule {

  public readonly friendlyName = 'Certificate Vendor';
  public readonly name = 'certificateVendor';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'assetLibrary',
    'commandAndControl',
    'deploymentHelper',
    'kms',
    'openSsl',
  ];

  public readonly dependsOnOptional: ModuleName[] = [];

  public readonly stackName: string;
  private readonly assetLibraryStackName: string;
  private readonly commandAndControlStackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-certificatevendor-${environment}`
    this.assetLibraryStackName = `cdf-assetlibrary-${environment}`;
    this.commandAndControlStackName = `cdf-commandandcontrol-${environment}`;
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.certificateVendor?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);
    if ((updatedAnswers.certificateVendor?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      {
        message: 'Will you be requesting certificates using a CSR?',
        type: 'confirm',
        name: 'certificateVendor.providingCSRs',
        default: false,
        askAnswered: true,
      },
      {
        message: 'Will you use ACMPCA to issue the certificate ?',
        type: 'confirm',
        name: 'certificateVendor.acmpcaEnabled',
        default: false,
        askAnswered: true,
        when(answers: Answers) {
          return answers.certificateVendor?.providingCSRs ?? false;
        },
      },
      {
        message: 'Enter the CAArn of ACMPCA to be used to sign the certificates with a CSR:',
        type: 'input',
        name: 'certificateVendor.caArnAcmpca',
        default: updatedAnswers.certificateVendor?.caArnAcmpca,
        askAnswered: true,
        when(answers: Answers) {
          return (answers.certificateVendor?.providingCSRs) && (answers.certificateVendor?.acmpcaEnabled);
        },
        validate(answer: string) {
          if ((answer?.length ?? 0) === 0) {
            return `You must enter the caARN of certificate ID.`;
          }
          return true;
        },
      },
      {
        message: 'Enter the CA certificate ID to be used to sign the certificates requested with a CSR:',
        type: 'input',
        name: 'certificateVendor.caCertificateId',
        default: updatedAnswers.certificateVendor?.caCertificateId,
        askAnswered: true,
        when(answers: Answers) {
          return answers.certificateVendor?.providingCSRs ?? false;
        },
        validate(answer: string) {
          if ((answer?.length ?? 0) === 0) {
            return `You must enter the CA certificate ID.`;
          }
          return true;
        },
      },
      {
        message: 'Will you be using the default policy for rotated certificates(answer No to inheret the policies from old cert)? ',
        type: 'confirm',
        name: 'certificateVendor.useDefaultPolicy',
        default: true,
        askAnswered: true,
      },
      {
        message: 'Enter the name of the policy to associate with certificates requested with a CSR:',
        type: 'input',
        name: 'certificateVendor.rotatedCertificatePolicy',
        default: updatedAnswers.certificateVendor?.rotatedCertificatePolicy,
        askAnswered: true,
        when(answers: Answers) {
          return (answers.certificateVendor?.providingCSRs) && (answers.certificateVendor?.useDefaultPolicy);
        },
        validate(answer: string) {
          if ((answer?.length ?? 0) === 0) {
            return `You must enter the policy name.`;
          }
          return true;
        },
      },
      ...applicationConfigurationPrompt(this.name, answers, [
        {
          defaultConfiguration: 'certificates/',
          propertyName: 'certificatesPrefix',
          question: 'The key prefix where certificates are stored'
        },
        {
          defaultConfiguration: '.zip',
          propertyName: 'certificatesSuffix',
          question: 'The key suffix where certificates are stored'
        },
        {
          defaultConfiguration: 300,
          propertyName: 'presignedUrlExpiryInSeconds',
          question: 'S3 Presigned Url expiry in seconds'
        },
        {
          defaultConfiguration: 'cdfRotateCertificates',
          propertyName: 'rotateCertificatesThingGroup',
          question: 'Change the name of the thing group if you want to use analternate thing group.'
        },
        {
          defaultConfiguration: 'cdf/certificates/{thingName}/get/accepted',
          propertyName: 'getSuccessTopic',
          question: 'MQTT Topic for Get Success'
        },
        {
          defaultConfiguration: 'cdf/certificates/{thingName}/get/rejected',
          propertyName: 'getFailureTopic',
          question: 'MQTT Topic for Get Failure'
        },
        {
          defaultConfiguration: 'cdf/certificates/+/get',
          propertyName: 'getRootTopic',
          question: 'MQTT Topic for Get Root'
        },
        {
          defaultConfiguration: 'cdf/certificates/{thingName}/ack/accepted',
          propertyName: 'ackSuccessTopic',
          question: 'MQTT Topic for Ack Success'
        },
        {
          defaultConfiguration: 'cdf/certificates/{thingName}/ack/rejected',
          propertyName: 'ackFailureTopic',
          question: 'MQTT Topic for Ack Failure'
        },
        {
          defaultConfiguration: 'cdf/certificates/+/ack',
          propertyName: 'ackRootTopic',
          question: 'MQTT Topic for Ack Root'
        },
        {
          defaultConfiguration: false,
          propertyName: 'deletePreviousCertificate',
          question: 'A feature toggle to enable deleting of the old certificate once rotated.'
        },
        {
          defaultConfiguration: 'status',
          propertyName: 'deviceStatusSuccessKey',
          question: 'The key to use when updating the device state in the Device Registry or Asset Library'
        },

        {
          defaultConfiguration: 'active',
          propertyName: 'deviceStatusSuccessValue',
          question: 'The value to use when updating the device state in the Device Registry or Asset Library'
        },

        {
          defaultConfiguration: 1095,
          propertyName: 'certificateExpiryInDays',
          question: 'If creating a new certificate from a CSR, the expiration date to set.'
        },

        {
          defaultConfiguration: 'AssetLibrary',
          propertyName: 'registryMode',
          question: 'Which data store to use to validate the status of a device'
        },
      ]),
    ], updatedAnswers);

    return updatedAnswers;

  }

  private getParameterOverrides(answers: Answers): string[] {
    const parameterOverrides = [
      `Environment=${answers.environment}`,
      `BucketName=${answers.s3.bucket}`,
      `KmsKeyId=${answers.kms.id}`,
      `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
      `AssetLibraryFunctionName=${answers.certificateVendor.assetLibraryFunctionName}`,
      `CommandsFunctionName=${answers.certificateVendor.commandsFunctionName}`,
      `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
    ];

    const addIfSpecified = (key: string, value: unknown) => {
      if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
    };

    addIfSpecified('CaCertificateId', answers.certificateVendor.caCertificateId);
    addIfSpecified('AcmpcaCaArn', answers.certificateVendor.caArnAcmpca);
    addIfSpecified('AcmpcaEnabled', answers.certificateVendor.acmpcaEnabled);
    addIfSpecified('RotatedCertificatePolicy', answers.certificateVendor.rotatedCertificatePolicy);
    addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

    return parameterOverrides;
  }

  public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
    const monorepoRoot = await getMonorepoRoot();
    const tasks: ListrTask[] = [{
      title: `Packaging module '${this.name}'`,
      task: async () => {
        await packageAndUploadTemplate({
          answers: answers,
          serviceName: 'certificatevendor',
          templateFile: 'infrastructure/cfn-certificatevendor.yml',
          cwd: path.join(monorepoRoot, 'source', 'packages', 'services', 'certificatevendor'),
          parameterOverrides: this.getParameterOverrides(answers),
        });
      },
    }
    ];
    return [answers, tasks]
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.certificateVendor, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.s3.bucket, ow.string.nonEmpty);

    const monorepoRoot = await getMonorepoRoot();
    const tasks: ListrTask[] = [];

    if ((answers.certificateVendor.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Detecting environment config for stack '${this.stackName}'`,
      task: async () => {
        if (answers.certificateVendor === undefined) {
          answers.certificateVendor = {};
        }
        const assetlibrarybyResourceLogicalId = await getStackResourceSummaries(this.assetLibraryStackName, answers.region);
        const commandsbyResourceLogicalId = await getStackResourceSummaries(this.commandAndControlStackName, answers.region);
        answers.certificateVendor.commandsFunctionName = commandsbyResourceLogicalId('RESTLambdaFunction');
        answers.certificateVendor.assetLibraryFunctionName = assetlibrarybyResourceLogicalId('LambdaFunction');
      }
    });


    tasks.push({
      title: `Packaging and deploying stack '${this.stackName}'`,
      task: async () => {
        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'certificatevendor',
          templateFile: 'infrastructure/cfn-certificatevendor.yml',
          cwd: path.join(monorepoRoot, 'source', 'packages', 'services', 'certificatevendor'),
          parameterOverrides: this.getParameterOverrides(answers),
          needsPackaging: true,
          needsCapabilityNamedIAM: true,
        });
      }
    });

    return [answers, tasks];
  }

  private generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()

    configBuilder
      .add(`LOGGING_LEVEL`, answers.certificateVendor.loggingLevel)
      .add(`AWS_S3_CERTIFICATES_PREFIX`, answers.certificateVendor.certificatesPrefix)
      .add(`AWS_S3_CERTIFICATES_SUFFIX`, answers.certificateVendor.certificatesSuffix)
      .add(`AWS_S3_CERTIFICATES_PRESIGNEDURL_EXPIRESINSECONDS`, answers.certificateVendor.presignedUrlExpiryInSeconds)
      .add(`AWS_IOT_THINGGROUP_ROTATECERTIFICATES`, answers.certificateVendor.rotateCertificatesThingGroup)
      .add(`MQTT_TOPICS_GET_SUCCESS`, answers.certificateVendor.getSuccessTopic)
      .add(`MQTT_TOPICS_GET_FAILURE`, answers.certificateVendor.getFailureTopic)
      .add(`MQTT_TOPICS_GET_ROOT`, answers.certificateVendor.getRootTopic)
      .add(`MQTT_TOPICS_ACK_SUCCESS`, answers.certificateVendor.ackSuccessTopic)
      .add(`MQTT_TOPICS_ACK_FAILURE`, answers.certificateVendor.ackFailureTopic)
      .add(`MQTT_TOPICS_ACK_ROOT`, answers.certificateVendor.ackRootTopic)
      .add(`FEATURES_DELETEPREVIOUSCERTIFICATE`, answers.certificateVendor.deletePreviousCertificate)
      .add(`DEFAULTS_DEVICE_STATUS_SUCCESS_KEY`, answers.certificateVendor.deviceStatusSuccessKey)
      .add(`DEFAULTS_DEVICE_STATUS_SUCCESS_VALUE`, answers.certificateVendor.deviceStatusSuccessValue)
      .add(`DEFAULTS_CERTIFICATES_CERTIFICATEEXPIRYDAYS`, answers.certificateVendor.certificateExpiryInDays)
      .add('USE_DEFAULT_POLICY',answers.certificateVendor.useDefaultPolicy)
      .add(`REGISTRY_MODE`, answers.certificateVendor.registryMode)

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
