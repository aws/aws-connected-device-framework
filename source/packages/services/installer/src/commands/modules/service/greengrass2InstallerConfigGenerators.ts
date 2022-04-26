import execa from 'execa';
import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';
import { Answers } from '../../../models/answers';
import { ModuleName, ServiceModule } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, getStackOutputs } from '../../../utils/cloudformation.util';

export class Greengrass2InstallerConfigGeneratorsInstaller implements ServiceModule {

    public readonly friendlyName = 'Greengrass V2 Installer Config Generators';
    public readonly name = 'greengrass2InstallerConfigGenerators';

    public readonly type = 'SERVICE';
    public readonly dependsOnMandatory: ModuleName[] = ['deploymentHelper'];
    public readonly dependsOnOptional: ModuleName[] = [];
    private readonly stackName: string;


    constructor(environment: string) {
        this.stackName = `cdf-greengrass2-installer-config-generators-${environment}`
    }

    public async prompts(answers: Answers): Promise<Answers> {

        delete answers.greengrass2InstallerConfigGenerators?.redeploy;
        let updatedAnswers: Answers = await inquirer.prompt([
            redeployIfAlreadyExistsPrompt(this.name, this.stackName),
        ], answers);
        if ((updatedAnswers.greengrass2InstallerConfigGenerators?.redeploy ?? true) === false) {
            return updatedAnswers;
        }

        updatedAnswers = await inquirer.prompt([
            ...applicationConfigurationPrompt(this.name, answers, [
                {
                    propertyName: 'deviceRootPath',
                    defaultConfiguration: '/greengrass/v2',
                    question: 'Path to device artifacts'
                },
                {
                    propertyName: 'deviceRootCAPath',
                    defaultConfiguration: '/greengrass/v2/AmazonRootCA1.pem',
                    question: 'Path to Root CA'
                },
                {
                    propertyName: 'deviceCertificateFilePath',
                    defaultConfiguration: '/greengrass/v2/cert.pem',
                    question: 'Path to certificate file'
                },
                {
                    propertyName: 'devicePrivateKeyPath',
                    defaultConfiguration: '/greengrass/v2/private.key',
                    question: 'Path to private key'
                },
                {
                    propertyName: 'deviceClaimCertificatePath',
                    defaultConfiguration: '/greengrass/v2/claim-certs/claim.pem.crt',
                    question: 'Path to claim certificate'
                },
                {
                    propertyName: 'deviceClaimCertificatePrivateKeyPath',
                    defaultConfiguration: '/greengrass/v2/claim-certs/claim.private.pem.key',
                    question: 'Path to claim private key'
                },

            ])
        ], updatedAnswers);

        return updatedAnswers;

    }

    public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

        ow(answers, ow.object.nonEmpty);
        ow(answers.environment, ow.string.nonEmpty);
        ow(answers.s3.bucket, ow.string.nonEmpty);
        ow(answers.deploymentHelper.lambdaArn, ow.string.nonEmpty);


        const tasks: ListrTask[] = [];

        if ((answers.greengrass2InstallerConfigGenerators.redeploy ?? true) === false) {
            return [answers, tasks];
        }

        tasks.push({
            title: `Packaging stack '${this.stackName}'`,
            task: async () => {
                await execa('aws', ['cloudformation', 'package',
                    '--template-file', '../greengrass2-installer-config-generators/infrastructure/cfn-greengrass2-installer-config-generators.yml',
                    '--output-template-file', '../greengrass2-installer-config-generators/infrastructure/cfn-greengrass2-installer-config-generators.yml.build',
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
                    `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
                ];

                const addIfSpecified = (key: string, value: unknown) => {
                    if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
                };

                addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

                await execa('aws', ['cloudformation', 'deploy',
                    '--template-file', '../greengrass2-installer-config-generators/infrastructure/cfn-greengrass2-installer-config-generators.yml.build',
                    '--stack-name', this.stackName,
                    '--parameter-overrides',
                    ...parameterOverrides,
                    '--capabilities', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND',
                    '--no-fail-on-empty-changeset',
                    '--region', answers.region,
                    '--tags', 'cdf_service=greengrass2-installer-config-generators', `cdf_environment=${answers.environment}`, ...answers.customTags.split(' '),
                ]);
            }
        });

        return [answers, tasks];
    }

    public generateApplicationConfiguration(answers: Answers): string {
        const configBuilder = new ConfigBuilder()

        configBuilder
            .add(`LOGGING_LEVEL`, answers.greengrass2InstallerConfigGenerators.loggingLevel)
            .add(`DEVICE_ROOT_PATH`, answers.greengrass2InstallerConfigGenerators.deviceRootPath)
            .add(`DEVICE_ROOT_CA_PATH`, answers.greengrass2InstallerConfigGenerators.deviceRootCAPath)
            .add(`DEVICE_CERTIFICATE_FILE_PATH`, answers.greengrass2InstallerConfigGenerators.deviceCertificateFilePath)
            .add(`DEVICE_PRIVATE_KEY_PATH`, answers.greengrass2InstallerConfigGenerators.devicePrivateKeyPath)
            .add(`DEVICE_CLAIM_CERTIFICATE_PATH`, answers.greengrass2InstallerConfigGenerators.deviceClaimCertificatePath)
            .add(`DEVICE_CLAIM_CERTIFICATE_PRIVATE_KEY_PATH`, answers.greengrass2InstallerConfigGenerators.deviceClaimCertificatePrivateKeyPath)

        return configBuilder.config;
    }


    public async generateLocalConfiguration(answers: Answers): Promise<string> {
        const configBuilder = new ConfigBuilder()

        const byOutputKey = await getStackOutputs(this.stackName, answers.region)

        configBuilder
            .add(`AWS_IOT_ENDPOINT_DATA`, answers.iotEndpoint)
            .add(`AWS_IOT_ENDPOINT_CREDENTIALS`, answers.iotCredentialEndpoint)
            .add(`AWS_IOT_ROLE_ALIAS`, byOutputKey('TokenExchangeRoleAlias'))

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
