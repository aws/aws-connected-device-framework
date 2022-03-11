import { Answers } from '../../../models/answers';
import { ListrTask } from 'listr2';
import { ModuleName, ServiceModule } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import ow from 'ow';
import execa from 'execa';
import inquirer from 'inquirer';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack } from '../../../utils/cloudformation.util';

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
      title: `Packaging stack '${this.stackName}'`,
      task: async () => {
        await execa('aws', ['cloudformation', 'package',
          '--template-file', '../auth-devicecert/infrastructure/cfn-auth-devicecert.yaml',
          '--output-template-file', '../auth-devicecert/infrastructure/cfn-auth-devicecert.yaml.build',
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
          `KmsKeyId=${answers.kms.id}`,
          `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('LoggingLevel', answers.authDeviceCert.loggingLevel);

        await execa('aws', ['cloudformation', 'deploy',
          '--template-file', '../auth-devicecert/infrastructure/cfn-auth-devicecert.yaml.build',
          '--stack-name', this.stackName,
          '--parameter-overrides',
          ...parameterOverrides,
          '--capabilities', 'CAPABILITY_NAMED_IAM',
          '--no-fail-on-empty-changeset',
          '--region', answers.region
        ]);
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
