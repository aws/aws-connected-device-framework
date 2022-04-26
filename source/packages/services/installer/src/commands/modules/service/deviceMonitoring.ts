import execa from 'execa';
import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';

import { Answers } from '../../../models/answers';
import { ModuleName, ServiceModule } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, getStackParameters, getStackResourceSummaries } from '../../../utils/cloudformation.util';

export class DeviceMonitoringInstaller implements ServiceModule {

  public readonly friendlyName = 'Device Monitoring';
  public readonly name = 'deviceMonitoring';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'assetLibrary',
  ];
  public readonly dependsOnOptional: ModuleName[] = [];
  private readonly stackName: string;
  private readonly assetLibraryStackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-device-monitoring-${environment}`;
    this.assetLibraryStackName = `cdf-assetlibrary-${environment}`;
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.deviceMonitoring?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);

    if ((updatedAnswers.deviceMonitoring?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt(
      applicationConfigurationPrompt(this.name, answers, []),
      updatedAnswers);
    return updatedAnswers;

  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.deviceMonitoring, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.s3.bucket, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.deviceMonitoring.redeploy ?? true) === false) {
      return [answers, tasks];
    }


    tasks.push({
      title: `Detecting environment config for stack '${this.stackName}'`,
      task: async () => {
        if (answers.deviceMonitoring === undefined) {
          answers.deviceMonitoring = {};
        }
        const assetlibrarybyResourceLogicalId = await getStackResourceSummaries(this.assetLibraryStackName, answers.region);
        answers.deviceMonitoring.assetLibraryFunctionName = assetlibrarybyResourceLogicalId('LambdaFunction');
      }
    });


    tasks.push({
      title: `Packaging stack '${this.stackName}'`,
      task: async () => {
        await execa('aws', ['cloudformation', 'package',
          '--template-file', '../device-monitoring/infrastructure/cfn-device-monitoring.yml',
          '--output-template-file', '../device-monitoring/infrastructure/cfn-device-monitoring.yml.build',
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
          `AssetLibraryFunctionName=${answers.deviceMonitoring.assetLibraryFunctionName}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await execa('aws', ['cloudformation', 'deploy',
          '--template-file', '../device-monitoring/infrastructure/cfn-device-monitoring.yml.build',
          '--stack-name', this.stackName,
          '--parameter-overrides',
          ...parameterOverrides,
          '--capabilities', 'CAPABILITY_NAMED_IAM',
          '--no-fail-on-empty-changeset',
          '--region', answers.region,
          '--tags', 'cdf_service=device-monitoring', `cdf_environment=${answers.environment}`, ...answers.customTags.split(' '),
        ]);
      }
    });

    return [answers, tasks];
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()
    configBuilder
      .add(`LOGGING_LEVEL`, answers.deviceMonitoring.loggingLevel)
    return configBuilder.config;
  }

  public async generateLocalConfiguration(answers: Answers): Promise<string> {

    const byParameterKey = await getStackParameters(this.stackName, answers.region)

    const configBuilder = new ConfigBuilder()
      .add(`ASSETLIBRARY_API_FUNCTION_NAME`, byParameterKey('AssetLibraryFunctionName'))

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
