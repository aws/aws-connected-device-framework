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
import {
  CreateAliasCommand,
  CreateKeyCommand,
  DescribeKeyCommand,
  EnableKeyRotationCommand,
  KMSClient,
  ListAliasesCommand,
  UpdateAliasCommand,
} from '@aws-sdk/client-kms';
import { Answers } from '../../../models/answers';
import { InfrastructureModule, ModuleName } from '../../../models/modules';

export class KmsKeyInstaller implements InfrastructureModule {

  public readonly friendlyName = 'KMS Key';
  public readonly name = 'kms';
  public readonly dependsOnMandatory: ModuleName[] = [];
  public readonly dependsOnOptional: ModuleName[] = [];
  public readonly type = 'INFRASTRUCTURE';


  public async prompts(answers: Answers): Promise<Answers> {

    answers = await inquirer.prompt([
      {
        message: 'Some of the modules chosen require a KMS Key. Use an existing KMS Key? If not, a new one will be created.',
        type: 'confirm',
        name: 'kms.useExisting',
        default: answers.kms?.useExisting ?? false,
        askAnswered: true,
      },

      {
        message: 'Identify the existing KMS key by id or alias?',
        type: 'list',
        name: 'kms.identifyBy',
        choices: [
          'id',
          'alias'
        ],
        default: answers.kms?.identifyBy,
        askAnswered: true,
        loop: false,
        when(answers: Answers) {
          return answers.kms.useExisting;
        },
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must choose an identification method.';
          }
          return true;
        },
      },

      {
        message: 'Enter the id of the KMS key.',
        type: 'input',
        name: 'kms.id',
        default: answers.kms?.id,
        askAnswered: true,
        when(answers: Answers) {
          return answers.kms.useExisting && answers.kms.identifyBy === 'id';
        },
        validate: async (answer: string) => {
          if (answer?.length === 0) {
            return 'You must enter the KMS key Id.';
          }
          const kms = new KMSClient({ region: answers.region });
          try {
            await kms.send(new DescribeKeyCommand({ KeyId: answer }));
          } catch (err) {
            return `KMS Key ID ${answer} not found in account ${answers.accountId} ${answers.region}.`;
          }
          return true;
        },
      },

      {
        message: 'Enter the alias of the KMS key.',
        type: 'input',
        name: 'kms.alias',
        default: answers.kms?.alias,
        askAnswered: true,
        when(answers: Answers) {
          return !answers.kms.useExisting || answers.kms.identifyBy === 'alias';
        },
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must enter the KMS key alias.';
          }
          return true;
        },
      }

    ], answers);

    // remove "alias/" prefix if entered
    if (answers.kms.alias?.startsWith("alias/")) {
      answers.kms.alias = answers.kms.alias.substring(6);
    }

    // verify if "use existing KMS alias" exists and if yes, rewrite to KMS ID
    if (answers.kms.useExisting === true) {
      if (answers.kms.identifyBy === 'alias') {
        const kms = new KMSClient({ region: answers.region });
        const aliases = await kms.send(new ListAliasesCommand({}));
        const key = aliases.Aliases?.find(a => a.AliasName === `alias/${answers.kms.alias}`);
        if (key === undefined) {
          throw new Error(`KMS Key alias ${answers.kms.alias} not found in account ${answers.accountId} ${answers.region}.`);
        } else {
          answers.kms.id = key.TargetKeyId;
        }
      }
    }

    return answers;
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.plain);
    ow(answers.region, ow.string.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.kms, ow.object.plain);
    ow(answers.kms.useExisting, ow.boolean);

    const tasks: ListrTask[] = [];
    const kms = new KMSClient({ region: answers.region });

    // A KMS Key must not be created if either of the following is true:
    // 1. answers.kms.id was set in prompts/config (only possible if answers.kms.useExisting is true)
    // 2. the KMS alias already exists, either because useExisting is true or because a previous run created it

    if (answers.kms.alias === undefined) {
      answers.kms.alias = `cdf-${answers.environment}`;
    }

    if (answers.kms.id === undefined) {
      const aliases = await kms.send(new ListAliasesCommand({}));
      const existingAlias = aliases.Aliases?.find(a => a.AliasName === `alias/${answers.kms.alias}`);
      if (existingAlias !== undefined) {
        answers.kms.id = existingAlias.TargetKeyId;
      }
    }

    if (answers.kms.id === undefined) {
      tasks.push(
        {
          title: 'Creating KMS key',
          task: async () => {

            const keyPolicy = {
              "Version": "2012-10-17",
              "Id": "key-default-1",
              "Statement": [
                {
                  "Sid": "Enable IAM User Permissions",
                  "Effect": "Allow",
                  "Principal": {
                    "AWS": `arn:aws:iam::${answers.accountId}:root`
                  },
                  "Action": "kms:*",
                  "Resource": "*"
                },
                {
                  "Sid": "Allow EventBridge to use the key",
                  "Effect": "Allow",
                  "Principal": {
                    "Service": "events.amazonaws.com"
                  },
                  "Action": [
                    "kms:Decrypt",
                    "kms:GenerateDataKey"
                  ],
                  "Resource": "*"
                }
              ]
            }

            const r = await kms.send(new CreateKeyCommand({
              Description: `CDF encryption key (${answers.environment})`,
              Policy: JSON.stringify(keyPolicy)
            }));
            answers.kms.id = r.KeyMetadata.KeyId;
          }
        },
        {
          title: 'Enabling key rotation',
          task: async () => {
            await kms.send(new EnableKeyRotationCommand({
              KeyId: answers.kms.id
            }));
          }
        }
      );

      const aliases = await kms.send(new ListAliasesCommand({}));
      const alias = aliases.Aliases?.find(a => a.AliasName === `alias/${answers.kms.alias}`);

      if (alias === undefined) {
        tasks.push({
          title: 'Creating key alias',
          task: async () => {
            await kms.send(new CreateAliasCommand({
              AliasName: `alias/${answers.kms.alias}`,
              TargetKeyId: answers.kms.id
            }));
          }
        });
      } else {
        tasks.push({
          title: 'Updating key alias',
          task: async () => {
            await kms.send(new UpdateAliasCommand({
              AliasName: `alias/${answers.kms.alias}`,
              TargetKeyId: answers.kms.id
            }));
          }
        });

      }
    }

    return [answers, tasks];
  }

  public async delete(_answers: Answers): Promise<ListrTask[]> {
    return []
  }

}
