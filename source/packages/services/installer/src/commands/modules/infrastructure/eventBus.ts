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
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';
import path from 'path';

import { Answers } from '../../../models/answers';
import { InfrastructureModule, ModuleName } from '../../../models/modules';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';
import { deleteStack, packageAndDeployStack, packageAndUploadTemplate } from '../../../utils/cloudformation.util';

export class EvenBusInstaller implements InfrastructureModule {

  public readonly friendlyName = 'EventBus';
  public readonly name = 'eventBus';
  public readonly dependsOnMandatory: ModuleName[] = [];
  public readonly dependsOnOptional: ModuleName[] = [];
  public readonly type = 'INFRASTRUCTURE';
  stackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-eventbus-${environment}`;
  }


  public async prompts(answers: Answers): Promise<Answers> {

    answers = await inquirer.prompt([
      {
        message: 'Some of the modules chosen require an EventBus. Use an existing EventBus? If not, a new one will be created.',
        type: 'confirm',
        name: 'eventBus.useExisting',
        default: answers.eventBus?.useExisting ?? false,
        askAnswered: true
      },
      {
        message: 'Enter existing EventBus Arn:',
        type: 'input',
        name: 'eventBus.arn',
        default: answers.eventBus?.arn,
        askAnswered: true,
        when(answers: Answers) {
          return answers.eventBus?.useExisting === true;
        }
      }
    ], answers);

    if ((answers.eventBus?.useExisting ?? false) === false) {
      delete answers.eventBus?.arn;
    }

    return answers;
  }

  public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
    const tasks: ListrTask[] = [{
      title: `Packaging module '${this.name}'`,
      task: async () => {
        const monorepoRoot = await getMonorepoRoot();
        await packageAndUploadTemplate({
          answers: answers,
          templateFile: 'cfn-eventbus.yaml',
          cwd: path.join(monorepoRoot, 'source', 'infrastructure', 'cloudformation'),
          parameterOverrides: [`Environment=${answers.environment}`, `ExistingEventBusArn=${answers.eventBus?.arn ?? ''}`],
          needsPackaging: false
        });
      },
    }
    ];
    return [answers, tasks]
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.plain);
    ow(answers.environment, ow.string.nonEmpty);

    if (answers.eventBus?.useExisting) {
      ow(answers.eventBus.arn, ow.string.nonEmpty);
    }

    const tasks: ListrTask[] = [];
    const monorepoRoot = await getMonorepoRoot();

    tasks.push({
      title: `Deploying stack '${this.stackName}'`,
      task: async () => {
        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'eventbus',
          templateFile: 'cfn-eventbus.yaml',
          parameterOverrides: [`Environment=${answers.environment}`, `ExistingEventBusArn=${answers.eventBus?.arn ?? ''}`],
          cwd: path.join(monorepoRoot, 'source', 'infrastructure', 'cloudformation'),
        });
      }
    });

    tasks.push({
      title: `Retrieving EventBridge info from stack '${this.stackName}'`,
      task: async () => {
        if (answers.eventBus === undefined) {
          answers.eventBus = {};
        }

        const cloudformation = new CloudFormationClient({ region: answers.region });
        const resources = await cloudformation.send(new DescribeStacksCommand({
          StackName: this.stackName
        }));
        const arn = resources.Stacks[0].Outputs.find(r => r.OutputKey === 'EventBusArn')?.OutputValue;
        answers.eventBus.arn = arn;
      }
    });

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
