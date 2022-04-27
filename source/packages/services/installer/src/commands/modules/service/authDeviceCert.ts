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
import { ModuleName, ServiceModule } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import ow from 'ow';
import inquirer from 'inquirer';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, packageAndDeployStack } from '../../../utils/cloudformation.util';

export class AuthDeviceCertInstaller implements ServiceModule {

  public readonly friendlyName = 'Auth (by device cert)';
  public readonly name = 'authDeviceCert';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'kms',
    "openSsl",
  ];
  public readonly dependsOnOptional: ModuleName[] = [];

  private readonly stackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-auth-devicecert-${environment}`
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.authDeviceCert?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);
    if ((updatedAnswers.authDeviceCert?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      ...applicationConfigurationPrompt(this.name, answers, [])
    ], updatedAnswers);

    return updatedAnswers;

  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.authDeviceCert, ow.object.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.authDeviceCert.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Packaging and deploying stack '${this.stackName}'`,
      task: async () => {

        const parameterOverrides = [
          `Environment=${answers.environment}`,
          `KmsKeyId=${answers.kms.id}`,
          `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('LoggingLevel', answers.authDeviceCert.loggingLevel);

        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'auth-devicecert',
          templateFile: '../auth-devicecert/infrastructure/cfn-auth-devicecert.yaml',
          parameterOverrides,
          needsPackaging: true,
          needsCapabilityNamedIAM: true,
        });
      }
    });

    return [answers, tasks];
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()
    configBuilder
      .add(`LOGGING_LEVEL`, answers.authDeviceCert.loggingLevel)
    return configBuilder.config;
  }

  public async generateLocalConfiguration(answers: Answers): Promise<string> {
    const configBuilder = new ConfigBuilder()
      .add(`AWS_ACCOUNTID`, answers.accountId)
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
