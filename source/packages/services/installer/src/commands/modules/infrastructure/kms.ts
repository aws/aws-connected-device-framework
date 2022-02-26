import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';

import {
  CreateAliasCommand, CreateKeyCommand, DescribeKeyCommand, EnableKeyRotationCommand, KMSClient,
  ListAliasesCommand,
  UpdateAliasCommand
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
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must enter the KMS key Id.';
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
          return (answers.kms.useExisting && answers.kms.identifyBy === 'alias') || !answers.kms.useExisting;
        },
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must enter the KMS key alias.';
          }
          return true;
        },
      }

    ], answers);

    // verify exists
    if (answers.kms.useExisting === true) {
      const kms = new KMSClient({ region: answers.region });
      if (answers.kms.identifyBy === 'alias') {
        const aliases = await kms.send(new ListAliasesCommand({}));
        const key = aliases.Aliases?.find(a => a.AliasName === `alias/${answers.kms.alias}`);
        if (key === undefined) {
          throw new Error(`KMS Key alias ${answers.kms.alias} not found`);
        } else {
          answers.kms.id = key.TargetKeyId;
        }
      } else {
        const key = await kms.send(new DescribeKeyCommand({ KeyId: answers.kms.id }));
        if (key === undefined) {
          throw new Error(`KMS Key alias ${answers.kms.alias} not found`);
        }
      }
    } else {
      const kms = new KMSClient({ region: answers.region });
      const aliases = await kms.send(new ListAliasesCommand({}));
      const key = aliases.Aliases?.find(a => a.AliasName === `alias/${answers.kms.alias}`);
      if (key !== undefined) {
        answers.kms.useExisting = true
        answers.kms.id = key.TargetKeyId;
      } else {
        delete answers.kms?.identifyBy;
        delete answers.kms?.id;
      }
    }

    return answers;

  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.plain);
    ow(answers.region, ow.string.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.kms.useExisting, ow.boolean);

    const tasks: ListrTask[] = [];
    const kms = new KMSClient({ region: answers.region });

    if (answers.kms.useExisting === false) {
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

      if (answers.kms.alias === undefined) {
        answers.kms.alias = `cdf-${answers.environment}`;
      }
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
