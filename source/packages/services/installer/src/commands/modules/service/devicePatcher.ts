import execa from 'execa';
import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';

import { Answers } from '../../../models/answers';
import { ModuleName, RestModule, PostmanEnvironment } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, getStackOutputs, getStackParameters, getStackResourceSummaries } from '../../../utils/cloudformation.util';

export class DevicePatcherInstaller implements RestModule {

    public readonly friendlyName = 'Device Patcher';
    public readonly name = 'devicePatcher';

    public readonly type = 'SERVICE';
    public readonly dependsOnMandatory: ModuleName[] = [
        'apigw',
        'kms',
        'openSsl'];
    public readonly dependsOnOptional: ModuleName[] = ['vpc', 'authJwt'];

    private readonly stackName: string;

    constructor(environment: string) {
        this.stackName = `cdf-device-patcher-${environment}`
    }

    public async prompts(answers: Answers): Promise<Answers> {

        delete answers.devicePatcher?.redeploy;
        let updatedAnswers: Answers = await inquirer.prompt([
            redeployIfAlreadyExistsPrompt(this.name, this.stackName),
        ], answers);
        if ((updatedAnswers.devicePatcher?.redeploy ?? true) === false) {
            return updatedAnswers;
        }

        updatedAnswers = await inquirer.prompt([
            ...applicationConfigurationPrompt(this.name, answers, []),
            ...customDomainPrompt(this.name, answers),
        ], updatedAnswers);

        return updatedAnswers;
    }

    public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

        ow(answers, ow.object.plain);
        ow(answers.environment, ow.string.nonEmpty);
        ow(answers.region, ow.string.nonEmpty);
        ow(answers.s3.bucket, ow.string.nonEmpty);
        ow(answers.apigw.type, ow.string.nonEmpty);
        ow(answers.apigw.templateSnippetS3UriBase, ow.string.nonEmpty);
        ow(answers.apigw.cloudFormationTemplate, ow.string.nonEmpty);

        const tasks: ListrTask[] = [];

        if ((answers.devicePatcher.redeploy ?? true) === false) {
            return [answers, tasks];
        }

        tasks.push({
            title: `Packaging stack '${this.stackName}'`,
            task: async () => {
                await execa('aws', ['cloudformation', 'package',
                    '--template-file', '../device-patcher/infrastructure/cfn-device-patcher.yml',
                    '--output-template-file', '../device-patcher/infrastructure/cfn-device-patcher.yml.build',
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
                    `AuthType=${answers.apigw.type}`,
                    `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
                    `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
                    `KmsKeyId=${answers.kms.id}`,
                    `ArtifactsBucket=${answers.s3.bucket}`,
                    `ArtifactsKeyPrefix=device-patcher/`,
                    `VpcId=${answers.vpc?.id ?? 'N/A'}`,
                    `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
                    `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
                    `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
                ];

                const addIfSpecified = (key: string, value: unknown) => {
                    if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
                };

                addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));
                addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
                addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);

                await execa('aws', ['cloudformation', 'deploy',
                    '--template-file', '../device-patcher/infrastructure/cfn-device-patcher.yml.build',
                    '--stack-name', this.stackName,
                    '--parameter-overrides',
                    ...parameterOverrides,
                    '--capabilities', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND',
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
            .add(`CUSTOMDOMAIN_BASEPATH`, answers.devicePatcher.customDomainBasePath)
            .add(`LOGGING_LEVEL`, answers.devicePatcher.loggingLevel)
            .add(`CORS_ORIGIN`, answers.apigw.corsOrigin)
        return configBuilder.config;
    }


    public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
        const byOutputKey = await getStackOutputs(this.stackName, answers.region)
        return {
            key: 'devicepatcher_base_url',
            value: byOutputKey('ApiGatewayUrl'),
            enabled: true
        }
    }

    public async generateLocalConfiguration(answers: Answers): Promise<string> {
        const byResourceLogicalId = await getStackResourceSummaries(this.stackName, answers.region)
        const byParameterKey = await getStackParameters(this.stackName, answers.region)

        const table = byResourceLogicalId('Table');

        const artifactsBucket = byParameterKey('ArtifactsBucket')
        const artifactsKeyPrefix = byParameterKey('ArtifactsKeyPrefix')
        const deploymentTasksQueue = byResourceLogicalId('AgentbasedDeploymentQueue')
        const ssmManagedInstanceRole = byResourceLogicalId('SSMManagedInstanceRole');

        const configBuilder = new ConfigBuilder()
            .add(`AWS_DYNAMODB_TABLE_NAME`, table)
            .add(`AWS_S3_ARTIFACTS_BUCKET`, artifactsBucket)
            .add(`AWS_S3_ARTIFACTS_PREFIX`, artifactsKeyPrefix)
            .add(`AWS_SQS_QUEUES_DEPLOYMENT_TASKS`, deploymentTasksQueue)
            .add(`AWS_SSM_MANAGED_INSTANCE_ROLE`, ssmManagedInstanceRole)

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
