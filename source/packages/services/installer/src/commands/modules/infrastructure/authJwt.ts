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
import { ModuleName, InfrastructureModule } from '../../../models/modules';
import ow from 'ow';
import inquirer from 'inquirer';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, packageAndDeployStack } from '../../../utils/cloudformation.util';

export class AuthJwtInstaller implements InfrastructureModule {

  public readonly friendlyName = 'Auth (by JWT)';
  public readonly name = 'authJwt';

  public readonly type = 'INFRASTRUCTURE';
  public readonly dependsOnMandatory: ModuleName[] = ["openSsl"];
  public readonly dependsOnOptional: ModuleName[] = [];
  private readonly stackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-auth-jwt-${environment}`
  }

  public async prompts(answers: Answers): Promise<Answers> {
    delete answers.authJwt?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);

    if ((updatedAnswers.authJwt?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([
      {
        message: `Enter the token issuer:`,
        type: 'input',
        name: 'authJwt.tokenIssuer',
        default: answers.authJwt?.tokenIssuer,
        askAnswered: true,
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must enter the token issuer.';
          }
          return true;
        },
      },
      ...applicationConfigurationPrompt(this.name, answers, []),
    ], updatedAnswers);

    return updatedAnswers
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

<<<<<<< HEAD
    if (this.deployAuthJwt(answers.apigw)) {

      ow(answers.authJwt, ow.object.nonEmpty);
      ow(answers.authJwt.tokenIssuer, ow.string.nonEmpty);

      if ((answers.authJwt.redeploy ?? true)) {
        tasks.push({
          title: `Packaging and deploying stack '${this.stackName}'`,
          task: async () => {

            const parameterOverrides = [
              `Environment=${answers.environment}`,
              `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
              `JwtIssuer=${answers.authJwt.tokenIssuer}`,
            ];

            const addIfSpecified = (key: string, value: unknown) => {
              if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
            };

            addIfSpecified('LoggingLevel', answers.authJwt.loggingLevel);

            await packageAndDeployStack({
              answers: answers,
              stackName: this.stackName,
              serviceName: 'auth-jwt',
              templateFile: '../auth-jwt/infrastructure/cfn-auth-jwt.yaml',
              parameterOverrides,
              needsPackaging: true,
              needsCapabilityNamedIAM: true,
            });
          }
        },
        );
      }
=======
>>>>>>> a356cc34 (fix some issues on authJwt and make includeOptionalModule pass by reference)

    ow(answers.authJwt, ow.object.nonEmpty);
    ow(answers.authJwt.tokenIssuer, ow.string.nonEmpty);

    if ((answers.authJwt.redeploy ?? true)) {
      tasks.push({
        title: `Packaging stack '${this.stackName}'`,
        task: async () => {
          await execa('aws', ['cloudformation', 'package',
            '--template-file', '../auth-jwt/infrastructure/cfn-auth-jwt.yaml',
            '--output-template-file', '../auth-jwt/infrastructure/cfn-auth-jwt.yaml.build',
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
            `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
            `JwtIssuer=${answers.authJwt.tokenIssuer}`,
          ];

          const addIfSpecified = (key: string, value: unknown) => {
            if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
          };

          addIfSpecified('LoggingLevel', answers.authJwt.loggingLevel);

          await execa('aws', ['cloudformation', 'deploy',
            '--template-file', '../auth-jwt/infrastructure/cfn-auth-jwt.yaml.build',
            '--stack-name', this.stackName,
            '--parameter-overrides',
            ...parameterOverrides,
            '--capabilities', 'CAPABILITY_NAMED_IAM',
            '--no-fail-on-empty-changeset',
            '--region', answers.region
          ]);
        }
      },
      );
    }

    tasks.push({
      title: `Retrieving lambda authorizer from stack '${this.stackName}'`,
      task: async () => {

        // const byResourceLogicalId = await getStackResourceSummaries(stackName, answers.region);
        const cloudFormation = new CloudFormationClient({ region: answers.region });
        const r = await cloudFormation.send(new DescribeStacksCommand({
          StackName: this.stackName
        }));
        answers.apigw.lambdaAuthorizerArn = r?.Stacks?.[0]?.Outputs?.find(o => o.OutputKey === 'CustomAuthLambdaArn')?.OutputValue;
      }
    })
    return [answers, tasks];
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
