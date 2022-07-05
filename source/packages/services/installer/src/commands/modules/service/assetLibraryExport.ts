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
import inquirer from 'inquirer';
import ow from 'ow';
import path from 'path';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, packageAndDeployStack, packageAndUploadTemplate } from '../../../utils/cloudformation.util';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';

export class AssetLibraryExportInstaller implements ServiceModule {


  public readonly friendlyName = 'Asset Library Export';
  public readonly name = 'assetLibraryExport';
  public readonly localProjectDir = 'assetlibrary-export';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'assetLibrary',
    'kms',
  ];
  public readonly dependsOnOptional: ModuleName[] = ['vpc'];
  public readonly stackName: string;

  constructor(environment: string) {
    this.stackName = `cdf-assetlibrary-export-${environment}`
  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.assetLibraryExport?.redeploy;

    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);

    if ((updatedAnswers.assetLibraryExport?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    updatedAnswers = await inquirer.prompt([{
      message: `Max concurrency for ETL Execution workflow`,
      type: 'input',
      name: 'assetLibraryExport.maxConcurrency',
      default: answers.assetLibraryExport?.maxConcurrency ?? 10,
      askAnswered: true,
      validate(answer: number) {
        if (answer <= 0) {
          return 'You must specify number larget than 0 for ETL concurrency';
        }
        return true;
      }
    },

    ...applicationConfigurationPrompt(this.name, answers, [
      {
        propertyName: 'extractExpandComponents',
        question: 'Set this to true if the device components need to be expanded',
        defaultConfiguration: true
      },
      {
        propertyName: 'extractIncludeGroups',
        question: 'Set this property to true, if any related groups needs to be included.',
        defaultConfiguration: true
      },
      {
        propertyName: 'extractAttributes',
        question: 'Specify any specific attributes which needs to be extracted, if its set to empty string then all attributes are extracted',
        defaultConfiguration: ''
      },
      {
        propertyName: 's3ExportPrefix',
        question: 'Modify the key prefix if it needs to be different then the default',
        defaultConfiguration: 'assetlibrary-export/'
      },
      {
        propertyName: 'defaultBatchBy',
        question: 'Specify this property to export the data batched by types, the supported config is either "type" or "category"',
        defaultConfiguration: 'TYPE'
      },
      {
        propertyName: 'defaultBatchSize',
        question: 'Specify the batch size to handle how many assetlibrary items needs to be batch togethar for the ETL workflow',
        defaultConfiguration: 10
      },
      {
        propertyName: 'loadPath',
        question: 'Modify the path, to configure the export "S3" key path',
        defaultConfiguration: "${aws.s3.export.prefix}${batch.category}/${batch.type}/dt=${moment(batch.timestamp).format('YYYY-MM-DD-HH-MM')}/${batch.id}.json"
      }
    ]),
    ], updatedAnswers);

    return updatedAnswers;
  }

  private getParameterOverrides(answers: Answers): string[] {
    const parameterOverrides = [
      `Environment=${answers.environment}`,
      `VpcId=${answers.vpc?.id ?? 'N/A'}`,
      `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
      `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
      `AuthType=${answers.apigw.type}`,
      `BucketName=${answers.s3.bucket}`,
      `KmsKeyId=${answers.kms.id}`,
      `NeptuneURL=${answers.assetLibrary.neptuneUrl}`,
      `ExportETLMaxConcurrency=${answers.assetLibraryExport.maxConcurrency}`,
    ];

    const addIfSpecified = (key: string, value: unknown) => {
      if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
    };

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
          serviceName: 'assetlibrary-export',
          templateFile: 'infrastructure/cfn-assetlibrary-export.yaml',
          cwd: path.join(monorepoRoot, 'source', 'packages', 'services', 'assetlibrary-export'),
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
    ow(answers.assetLibraryExport, ow.object.nonEmpty);

    const monorepoRoot = await getMonorepoRoot();
    const tasks: ListrTask[] = [];

    if ((answers.assetLibraryExport.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Packaging and deploy stack '${this.stackName}'`,
      task: async () => {



        await packageAndDeployStack({
          answers: answers,
          stackName: this.stackName,
          serviceName: 'assetlibrary-export',
          templateFile: 'infrastructure/cfn-assetlibrary-export.yaml',
          cwd: path.join(monorepoRoot, 'source', 'packages', 'services', 'assetlibrary-export'),
          parameterOverrides: this.getParameterOverrides(answers),
          needsPackaging: true,
          needsCapabilityNamedIAM: true,
          needsCapabilityAutoExpand: true,
        });
      }
    });

    return [answers, tasks];
  }

  private generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()

    configBuilder
      .add(`LOGGING_LEVEL`, answers.assetLibraryExport.loggingLevel)
      .add(`AWS_S3_EXPORT_PREFIX`, answers.assetLibraryExport.s3ExportPrefix)
      .add(`DEFAULTS_BATCH_BY`, answers.assetLibraryExport.defaultBatchBy)
      .add(`DEFAULTS_BATCH_SIZE`, answers.assetLibraryExport.defaultBatchSize)
      .add(`DEFAULTS_ETL_LOAD_PATH`, answers.assetLibraryExport.loadPath)
      .add(`DEFAULTS_ETL_EXTRACT_DEVICEEXTRACTOR_ATTRIBUTES`, answers.assetLibraryExport.extractAttributes)
      .add(`DEFAULTS_ETL_EXTRACT_DEVICEEXTRACTOR_EXPANDCOMPONENTS`, answers.assetLibraryExport.extractExpandComponents)
      .add(`DEFAULTS_ETL_EXTRACT_DEVICEEXTRACTOR_INCLUDEGROUPS`, answers.assetLibraryExport.extractIncludeGroups)

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
