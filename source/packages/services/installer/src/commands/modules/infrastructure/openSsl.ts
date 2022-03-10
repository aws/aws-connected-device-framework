import execa from 'execa';
import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';
import path from 'path';

import { LambdaClient, ListLayerVersionsCommand } from '@aws-sdk/client-lambda';

import { Answers } from '../../../models/answers';
import { InfrastructureModule, ModuleName } from '../../../models/modules';
import { deleteStack } from '../../../utils/cloudformation.util';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';

export class OpenSslInstaller implements InfrastructureModule {

  public readonly friendlyName = 'OpenSSL Lambda Layer';
  public readonly name = 'openSsl';
  public readonly dependsOnMandatory: ModuleName[] = [];
  public readonly dependsOnOptional: ModuleName[] = [];
  public readonly type = 'INFRASTRUCTURE';

  private readonly stackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-openssl-${environment}`;
  }

  public async prompts(answers: Answers): Promise<Answers> {

    if (answers.openSsl === undefined) {
      answers.openSsl = {};
    }

    // check to see if openssl lambda layer already exists
    const lambda = new LambdaClient({ region: answers.region });
    const r = await lambda.send(new ListLayerVersionsCommand({
      LayerName: 'cdf-openssl'
    }));
    if ((r?.LayerVersions?.length ?? 0) > 0) {
      // if it does exist, ask whether it needs to be re built and uploaded
      answers = await inquirer.prompt([
        {
          message: 'The cdf-openssl lambda layer has been previously deployed. Does it need redeploying?',
          type: 'confirm',
          name: 'openSsl.deploy',
          default: false,
          askAnswered: true,
        }
      ], answers);

    } else {
      // if not, upload it
      answers.openSsl.deploy = true;
    }

    delete answers.openSsl.arn;

    return answers;

  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.plain);
    ow(answers.openSsl, ow.object.plain);
    ow(answers.region, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    const monorepoRoot = await getMonorepoRoot();

    if (answers.openSsl.deploy) {
      tasks.push({
        title: 'Building OpenSSL',
        task: async () => {
          await execa('infrastructure/build.bash', ['--region', answers.region], {
            cwd: path.join(monorepoRoot, 'source', 'infrastructure', 'lambdaLayers', 'openssl')
          });
        }
      });

      tasks.push({
        title: `Packaging stack '${this.stackName}'`,
        task: async () => {
          await execa('aws', ['cloudformation', 'package',
            '--template-file', 'infrastructure/cfn-openssl-layer.yml',
            '--output-template-file', 'infrastructure/cfn-openssl-layer.yml.build',
            '--s3-bucket', answers.s3.bucket,
            '--s3-prefix', 'cloudformation/artifacts/',
            '--region', answers.region
          ], {
            cwd: path.join(monorepoRoot, 'source', 'infrastructure', 'lambdaLayers', 'openssl')
          });
        }
      });

      tasks.push({
        title: `Deploying stack '${this.stackName}'`,
        task: async () => {

          await execa('aws', ['cloudformation', 'deploy',
            '--template-file', 'infrastructure/cfn-openssl-layer.yml.build',
            '--stack-name', this.stackName,
            '--parameter-overrides',
            `Environment=${answers.environment}`,
            '--capabilities', 'CAPABILITY_NAMED_IAM',
            '--no-fail-on-empty-changeset',
            '--region', answers.region
          ], {
            cwd: path.join(monorepoRoot, 'source', 'infrastructure', 'lambdaLayers', 'openssl')
          });
        }
      });
    }

    tasks.push({
      title: 'Retrieving OpenSSL lambda layer arn',
      task: async () => {
        const lambda = new LambdaClient({ region: answers.region });
        const r = await lambda.send(new ListLayerVersionsCommand({
          LayerName: 'cdf-openssl'
        }));

        if ((r?.LayerVersions?.length ?? 0) === 0) {
          throw new Error('Failed to retrieve cdf-openssl layer version');
        }

        answers.openSsl.arn = r.LayerVersions[0].LayerVersionArn;
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
