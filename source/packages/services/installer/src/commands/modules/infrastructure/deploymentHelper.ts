import execa from 'execa';
import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';
import path from 'path';

import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

import { Answers } from '../../../models/answers';
import { InfrastructureModule, ModuleName } from '../../../models/modules';
import { deleteStack } from '../../../utils/cloudformation.util';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';

export class DeploymentHelperInstaller implements InfrastructureModule {

  public readonly friendlyName = 'Deployment Helper';
  public readonly name = 'deploymentHelper';
  public readonly dependsOnMandatory: ModuleName[] = [];
  public readonly dependsOnOptional: ModuleName[] = ['vpc'];
  public readonly type = 'INFRASTRUCTURE';

  private readonly vpcDeploymentHelperStackName: string
  private readonly deploymentHelperStackName: string

  constructor(environment: string) {
    this.vpcDeploymentHelperStackName = `cdf-deployment-helper-vpc-${environment}`;
    this.deploymentHelperStackName = `cdf-deployment-helper-${environment}`;
  }

  public async prompts(answers: Answers): Promise<Answers> {

    if (answers.deploymentHelper === undefined) {
      answers.deploymentHelper = {};
    }

    try {
      const cloudFormation = new CloudFormationClient({ region: answers.region });
      const describePromises = [cloudFormation.send(new DescribeStacksCommand({
        StackName: this.deploymentHelperStackName
      }))]

      if (answers.vpc?.id) {
        describePromises.push(cloudFormation.send(new DescribeStacksCommand({
          StackName: this.vpcDeploymentHelperStackName
        })))
      }

      const describerDeploymentHelperStackResult = await Promise.all(describePromises);
      const stacksFound = describerDeploymentHelperStackResult.find(o => o.Stacks.length < 1) === undefined

      if (stacksFound) {
        // if it does exist, ask whether it needs to be redeployed
        answers = await inquirer.prompt([
          {
            message: 'The deployment helper has been previously deployed. Does it need redeploying?',
            type: 'confirm',
            name: 'deploymentHelper.deploy',
            default: answers.deploymentHelper?.deploy,
            askAnswered: true,
          },
        ], answers);
      }
    } catch (e) {
      if (e.code !== 'ValidationError') {
        // not yet deployed, so deploy it
        answers.deploymentHelper.deploy = true;
      } else {
        throw e;
      }
    }

    return answers;

  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.plain);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.region, ow.string.nonEmpty);

    if (answers.deploymentHelper?.deploy) {
      ow(answers.s3.bucket, ow.string.nonEmpty);
    }

    const tasks: ListrTask[] = [];

    const templateFileIn = 'infrastructure/cfn-deployment-helper.yaml';
    const vpcTemplateFileIn = 'infrastructure/cfn-deployment-helper-vpc.yaml';
    const skipVpcDeploymentHelper = answers.vpc?.id === undefined
    const monorepoRoot = await getMonorepoRoot();

    if (answers.deploymentHelper?.deploy) {
      tasks.push({
        title: `Packaging stack '${this.deploymentHelperStackName}'`,
        task: async () => {
          await execa('aws', ['cloudformation', 'package',
            '--template-file', templateFileIn,
            '--output-template-file', templateFileIn + '.build',
            '--s3-bucket', answers.s3.bucket,
            '--s3-prefix', 'cloudformation/artifacts/',
            '--region', answers.region
          ], {
            cwd: path.join(monorepoRoot, 'source', 'packages', 'libraries', 'core', 'deployment-helper')
          });
        }
      });

      tasks.push({
        title: `Deploying stack '${this.deploymentHelperStackName}'`,
        task: async () => {
          await execa('aws', ['cloudformation', 'deploy',
            '--template-file', templateFileIn + '.build',
            '--stack-name', this.deploymentHelperStackName,
            '--parameter-overrides',
            `Environment=${answers.environment}`,
            `ArtifactsBucket=${answers.s3.bucket}`,
            '--capabilities', 'CAPABILITY_NAMED_IAM',
            '--no-fail-on-empty-changeset',
            '--region', answers.region
          ], {
            cwd: path.join(monorepoRoot, 'source', 'packages', 'libraries', 'core', 'deployment-helper')
          });
        }
      });

      tasks.push({
        title: `Packaging stack '${this.vpcDeploymentHelperStackName}'`,
        skip: skipVpcDeploymentHelper,
        task: async () => {
          await execa('aws', ['cloudformation', 'package',
            '--template-file', vpcTemplateFileIn,
            '--output-template-file', vpcTemplateFileIn + '.build',
            '--s3-bucket', answers.s3.bucket,
            '--s3-prefix', 'cloudformation/artifacts/',
            '--region', answers.region
          ], {
            cwd: path.join(monorepoRoot, 'source', 'packages', 'libraries', 'core', 'deployment-helper')
          });
        }
      });

      tasks.push({
        title: `Deploying stack '${this.vpcDeploymentHelperStackName}'`,
        skip: skipVpcDeploymentHelper,
        task: async () => {
          await execa('aws', ['cloudformation', 'deploy',
            '--template-file', vpcTemplateFileIn + '.build',
            '--stack-name', this.vpcDeploymentHelperStackName,
            '--parameter-overrides',
            `Environment=${answers.environment}`,
            `ArtifactsBucket=${answers.s3.bucket}`,
            `VpcId=${answers.vpc?.id ?? 'N/A'}`,
            `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? 'N/A'}`,
            `PrivateSubnetIds=${answers.vpc?.privateSubnetIds ?? 'N/A'}`,
            '--capabilities', 'CAPABILITY_NAMED_IAM',
            '--no-fail-on-empty-changeset',
            '--region', answers.region
          ], {
            cwd: path.join(monorepoRoot, 'source', 'packages', 'libraries', 'core', 'deployment-helper')
          });
        }
      });
    }

    tasks.push({
      title: `Retrieving config from stack '${this.deploymentHelperStackName}'`,
      task: async () => {
        const cloudFormation = new CloudFormationClient({ region: answers.region });
        const r = await cloudFormation.send(new DescribeStacksCommand({
          StackName: this.deploymentHelperStackName
        }));
        answers.deploymentHelper.lambdaArn = r?.Stacks?.[0]?.Outputs?.find(o => o.OutputKey === 'CustomResourceLambdaArn')?.OutputValue
      }
    })

    tasks.push({
      title: `Retrieving config from stack '${this.vpcDeploymentHelperStackName}'`,
      skip: skipVpcDeploymentHelper,
      task: async () => {
        const cloudFormation = new CloudFormationClient({ region: answers.region });
        const r = await cloudFormation.send(new DescribeStacksCommand({
          StackName: this.vpcDeploymentHelperStackName
        }));
        answers.deploymentHelper.vpcLambdaArn = r?.Stacks?.[0]?.Outputs?.find(o => o.OutputKey === 'CustomResourceVpcLambdaArn')?.OutputValue;
      }
    })

    return [answers, tasks];
  }

  public async delete(answers: Answers): Promise<ListrTask[]> {
    const tasks: ListrTask[] = [];
    tasks.push({
      title: `Deleting stack deploymentHelper`,
      task: async () => {
        await deleteStack(this.deploymentHelperStackName, answers.region)
        await deleteStack(this.vpcDeploymentHelperStackName, answers.region)
      }
    });
    return tasks

  }

}
