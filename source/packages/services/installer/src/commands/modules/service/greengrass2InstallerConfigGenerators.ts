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
import ow from 'ow';
import { Answers } from '../../../models/answers';
import { ModuleName, ServiceModule } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, getStackOutputs, packageAndDeployStack, packageAndUploadTemplate } from '../../../utils/cloudformation.util';

export class Greengrass2InstallerConfigGeneratorsInstaller implements ServiceModule {

  public readonly friendlyName = 'Greengrass V2 Installer Config Generators';
  public readonly name = 'greengrass2InstallerConfigGenerators';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = ['deploymentHelper'];
  public readonly dependsOnOptional: ModuleName[] = [];
  private readonly stackName: string;


  constructor(environment: string) {
    this.stackName = `cdf-greengrass2-installer-config-generators-${environment}`
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.greengrass2InstallerConfigGenerators?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);
    if ((updatedAnswers.greengrass2InstallerConfigGenerators?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      ...applicationConfigurationPrompt(this.name, answers, [
        {
          propertyName: 'deviceRootPath',
          defaultConfiguration: '/greengrass/v2',
          question: 'Path to device artifacts'
        },
        {
          propertyName: 'deviceRootCAPath',
          defaultConfiguration: '/greengrass/v2/AmazonRootCA1.pem',
          question: 'Path to Root CA'
        },
        {
          propertyName: 'deviceCertificateFilePath',
          defaultConfiguration: '/greengrass/v2/cert.pem',
          question: 'Path to certificate file'
        },
        {
          propertyName: 'devicePrivateKeyPath',
          defaultConfiguration: '/greengrass/v2/private.key',
          question: 'Path to private key'
        },
        {
          propertyName: 'deviceClaimCertificatePath',
          defaultConfiguration: '/greengrass/v2/claim-certs/claim.pem.crt',
          question: 'Path to claim certificate'
        },
        {
          propertyName: 'deviceClaimCertificatePrivateKeyPath',
          defaultConfiguration: '/greengrass/v2/claim-certs/claim.private.pem.key',
          question: 'Path to claim private key'
        },

      ])
    ], updatedAnswers);

    return updatedAnswers;
  }

  private getParameterOverrides(answers: Answers): string[] {
    const parameterOverrides = [
      `Environment=${answers.environment}`,
      `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
    ];

    const addIfSpecified = (key: string, value: unknown) => {
      if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
    };

    addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));
    return parameterOverrides;
  }

  public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
    const tasks: ListrTask[] = [{
      title: `Packaging module '${this.name}'`,
      task: async () => {
        await packageAndUploadTemplate({
          answers: answers,
          templateFile: '../greengrass2-installer-config-generators/infrastructure/cfn-greengrass2-installer-config-generators.yml',
          parameterOverrides: this.getParameterOverrides(answers),
        });
      },
    }
    ];
    return [answers, tasks]
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {
    ow(answers, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.s3.bucket, ow.string.nonEmpty);
    ow(answers.deploymentHelper.lambdaArn, ow.string.nonEmpty);


    const tasks: ListrTask[] = [];

    if ((answers.greengrass2InstallerConfigGenerators.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Packaging and deploying stack '${this.stackName}'`,
      task: async () => {



        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'greengrass2-installer-config-generators',
          templateFile: '../greengrass2-installer-config-generators/infrastructure/cfn-greengrass2-installer-config-generators.yml',
          parameterOverrides: this.getParameterOverrides(answers),
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
      .add(`LOGGING_LEVEL`, answers.greengrass2InstallerConfigGenerators.loggingLevel)
      .add(`DEVICE_ROOT_PATH`, answers.greengrass2InstallerConfigGenerators.deviceRootPath)
      .add(`DEVICE_ROOT_CA_PATH`, answers.greengrass2InstallerConfigGenerators.deviceRootCAPath)
      .add(`DEVICE_CERTIFICATE_FILE_PATH`, answers.greengrass2InstallerConfigGenerators.deviceCertificateFilePath)
      .add(`DEVICE_PRIVATE_KEY_PATH`, answers.greengrass2InstallerConfigGenerators.devicePrivateKeyPath)
      .add(`DEVICE_CLAIM_CERTIFICATE_PATH`, answers.greengrass2InstallerConfigGenerators.deviceClaimCertificatePath)
      .add(`DEVICE_CLAIM_CERTIFICATE_PRIVATE_KEY_PATH`, answers.greengrass2InstallerConfigGenerators.deviceClaimCertificatePrivateKeyPath)

    return configBuilder.config;
  }


  public async generateLocalConfiguration(answers: Answers): Promise<string> {
    const configBuilder = new ConfigBuilder()

    const byOutputKey = await getStackOutputs(this.stackName, answers.region)

    configBuilder
      .add(`AWS_IOT_ENDPOINT_DATA`, answers.iotEndpoint)
      .add(`AWS_IOT_ENDPOINT_CREDENTIALS`, answers.iotCredentialEndpoint)
      .add(`AWS_IOT_ROLE_ALIAS`, byOutputKey('TokenExchangeRoleAlias'))

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
