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
import { Lambda } from '@aws-sdk/client-lambda';
import inquirer, { Question } from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';
import path from 'path';
import { Answers, CAAliases } from '../../../models/answers';
import { ModuleName, ServiceModule } from '../../../models/modules';
import { applicationConfigurationPrompt } from '../../../prompts/applicationConfiguration.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';
import {
    deleteStack,
    getStackResourceSummaries,
    packageAndDeployStack,
    packageAndUploadTemplate,
} from '../../../utils/cloudformation.util';
import * as CommonArnValidations from '../../../utils/common-arn-validations';
import { ConfigBuilder } from '../../../utils/configBuilder';

export class CertificateVendorInstaller implements ServiceModule {
    public readonly friendlyName = 'Certificate Vendor';
    public readonly name = 'certificateVendor';

    public readonly type = 'SERVICE';
    public readonly dependsOnMandatory: ModuleName[] = [
        'assetLibrary',
        'commandAndControl',
        'deploymentHelper',
        'kms',
        'openSsl',
    ];

    public readonly dependsOnOptional: ModuleName[] = [];

    public readonly stackName: string;
    private readonly assetLibraryStackName: string;
    private readonly commandAndControlStackName: string;

    constructor(environment: string) {
        this.stackName = `cdf-certificatevendor-${environment}`;
        this.assetLibraryStackName = `cdf-assetlibrary-${environment}`;
        this.commandAndControlStackName = `cdf-commandandcontrol-${environment}`;
    }

    public async prompts(answers: Answers): Promise<Answers> {
        delete answers.certificateVendor?.redeploy;
        let updatedAnswers: Answers = await inquirer.prompt(
            [redeployIfAlreadyExistsPrompt(this.name, this.stackName)],
            answers
        );
        if ((updatedAnswers.certificateVendor?.redeploy ?? true) === false) {
            return updatedAnswers;
        }

        if (updatedAnswers.certificateVendor === undefined) {
            updatedAnswers.certificateVendor = {};
        }

        const pcaAliases = await this.getPcaAliases(answers);
        updatedAnswers.certificateVendor.pcaAliases = pcaAliases;

        const iotCaAliases = await this.getIotCaAliases(answers);
        updatedAnswers.certificateVendor.iotCaAliases = iotCaAliases;

        // eslint-disable-next-line
        const _ = this;

        updatedAnswers = await inquirer.prompt(
            [
                {
                    message: 'Will you be requesting certificates using a CSR?',
                    type: 'confirm',
                    name: 'certificateVendor.providingCSRs',
                    default: false,
                    askAnswered: true,
                },
                {
                    message: 'Will you use ACMPCA to issue the certificate ?',
                    type: 'confirm',
                    name: 'certificateVendor.acmpcaEnabled',
                    default: false,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.certificateVendor?.providingCSRs ?? false;
                    },
                },
                {
                    message: `If using ACM PCA, and ACM PCA is located in another AWS Account, enter the IAM cross-account role (leave blank otherwise)`,
                    type: 'input',
                    name: 'certificateVendor.acmpcaCrossAccountRoleArn',
                    default: answers.certificateVendor?.acmpcaCrossAccountRoleArn ?? '',
                    askAnswered: true,
                    validate: (answer: string) => {
                        if (answer?.length === 0) {
                            return true; // TODO: should this be false?
                        }
                        return CommonArnValidations.validateAwsIAMRoleArn(answer);
                    },
                    when(answers: Answers) {
                        return (
                            answers.certificateVendor?.providingCSRs &&
                            answers.certificateVendor?.acmpcaEnabled
                        );
                    },
                },
                {
                    message: `If ACM PCA is located in a different region, enter the region name (leave blank for default region)`,
                    type: 'input',
                    name: 'certificateVendor.acmpcaRegion',
                    default: answers.certificateVendor?.acmpcaRegion ?? answers.region,
                    askAnswered: true,
                    validate(answer: string) {
                        if (answer?.length === 0) {
                            return false;
                        }
                        return true;
                    },
                    when(answers: Answers) {
                        return (
                            answers.certificateVendor?.providingCSRs &&
                            answers.certificateVendor?.acmpcaEnabled
                        );
                    },
                },
                {
                    message:
                        'Enter the CertificateAuthorityArn (caArn) of ACMPCA to be used to sign the certificates with a CSR:',
                    type: 'input',
                    name: 'certificateVendor.caArnAcmpca',
                    default: updatedAnswers.certificateVendor?.caArnAcmpca,
                    askAnswered: true,
                    when(answers: Answers) {
                        return (
                            answers.certificateVendor?.providingCSRs &&
                            answers.certificateVendor?.acmpcaEnabled
                        );
                    },
                    validate(answer: string) {
                        if ((answer?.length ?? 0) === 0) {
                            return `You must enter the CertificateAuthorityArn (caArn) of certificate ID.`;
                        }
                        return true;
                    },
                },
                {
                    message:
                        'Choose the Signaling Algorithm of ACMPCA to be used to sign the certificates with a CSR:',
                    type: 'list',
                    name: 'certificateVendor.acmpcaSigningAlgorithm',
                    choices: [
                        'SHA256WITHECDSA',
                        'SHA384WITHECDSA',
                        'SHA512WITHECDSA',
                        'SHA256WITHRSA',
                        'SHA384WITHRSA',
                        'SHA512WITHRSA',
                    ],
                    default: updatedAnswers.certificateVendor?.acmpcaSigningAlgorithm,
                    askAnswered: true,
                    when(answers: Answers) {
                        return (
                            answers.certificateVendor?.providingCSRs &&
                            answers.certificateVendor?.acmpcaEnabled
                        );
                    },
                    validate(answer: string) {
                        if ((answer?.length ?? 0) === 0) {
                            return `You must choose a Signaling Algorithm.`;
                        }
                        return true;
                    },
                },
                {
                    message:
                        'Enter the CA certificate ID to be used to sign the certificates requested with a CSR:',
                    type: 'input',
                    name: 'certificateVendor.caCertificateId',
                    default: updatedAnswers.certificateVendor?.caCertificateId,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.certificateVendor?.providingCSRs ?? false;
                    },
                    validate(answer: string) {
                        if ((answer?.length ?? 0) === 0) {
                            return `You must enter the CA certificate ID.`;
                        }
                        return true;
                    },
                },
            ],
            updatedAnswers
        );

        updatedAnswers = await inquirer.prompt(
            [
                {
                    message: `Create or modify AWS IoT CA alias list?`,
                    type: 'confirm',
                    name: 'certificateVendor.setIotCaAliases',
                    default: answers.certificateVendor?.setIotCaAliases ?? true,
                    askAnswered: true,
                    when(answers: Answers) {
                        return (
                            answers.certificateVendor?.providingCSRs &&
                            answers.certificateVendor?.acmpcaEnabled
                        );
                    },
                },
            ],
            updatedAnswers
        );

        //Collect the IoT CA List
        let iotCaFinished = false;
        if (updatedAnswers.certificateVendor?.setIotCaAliases) {
            while (!iotCaFinished) {
                const iotCaAliases = await this.getIotCaAliases(updatedAnswers);
                updatedAnswers.certificateVendor.iotCaAliases = iotCaAliases;
                updatedAnswers = await inquirer.prompt(
                    [..._.getIoTCAPrompt(answers, iotCaAliases)],
                    updatedAnswers
                );
                // Update the iotCaAlias to upper case
                if (updatedAnswers.certificateVendor.iotCaAlias === undefined) {
                    updatedAnswers.certificateVendor.iotCaFinished = true;
                } else {
                    updatedAnswers.certificateVendor.iotCaAlias =
                        updatedAnswers.certificateVendor.iotCaAlias.toUpperCase();
                    if (
                        !updatedAnswers.certificateVendor.iotCaAliases.list.includes(
                            updatedAnswers.certificateVendor.iotCaAlias
                        )
                    ) {
                        const alias = updatedAnswers.certificateVendor.iotCaAlias;
                        const value = updatedAnswers.certificateVendor.iotCaID;
                        updatedAnswers.certificateVendor.iotCaAliases.cas.push({ alias, value });
                        updatedAnswers.certificateVendor.iotCaAliases.list.push(alias);
                    }
                }
                iotCaFinished = updatedAnswers.certificateVendor.iotCaFinished;
            }
        }

        updatedAnswers = await inquirer.prompt(
            [
                {
                    message: `Create or modify ACM PCA CA alias list?`,
                    type: 'confirm',
                    name: 'certificateVendor.setPcaAliases',
                    default: answers.certificateVendor?.setPcaAliases ?? true,
                    askAnswered: true,
                    when(answers: Answers) {
                        return (
                            answers.certificateVendor?.providingCSRs &&
                            answers.certificateVendor?.acmpcaEnabled
                        );
                    },
                },
            ],
            updatedAnswers
        );

        //Collect the ACM PCA List
        let pcaFinished = false;
        if (updatedAnswers.certificateVendor?.setPcaAliases) {
            while (!pcaFinished) {
                const pcaAliases = await this.getPcaAliases(updatedAnswers);
                updatedAnswers.certificateVendor.pcaAliases = pcaAliases;
                updatedAnswers = await inquirer.prompt(
                    [..._.getPCAPrompt(answers, pcaAliases)],
                    updatedAnswers
                );
                if (updatedAnswers.certificateVendor.pcaAlias === undefined) {
                    updatedAnswers.certificateVendor.pcaFinished = true;
                } else {
                    // Update the pcaAlias to upper case to be stored in the installer config
                    updatedAnswers.certificateVendor.pcaAlias =
                        updatedAnswers.certificateVendor.pcaAlias.toUpperCase();
                    if (
                        !updatedAnswers.certificateVendor.pcaAliases.list.includes(
                            updatedAnswers.certificateVendor.pcaAlias
                        )
                    ) {
                        const alias = updatedAnswers.certificateVendor.pcaAlias;
                        const value = updatedAnswers.certificateVendor.pcaArn;
                        updatedAnswers.certificateVendor.pcaAliases.cas.push({ alias, value });
                        updatedAnswers.certificateVendor.pcaAliases.list.push(alias);
                    }
                }
                pcaFinished = updatedAnswers.certificateVendor.pcaFinished;
            }
        }

        updatedAnswers = await inquirer.prompt(
            [
                {
                    message:
                        'Will you be using the default policy for rotated certificates(answer No to inheret the policies from old cert)? ',
                    type: 'confirm',
                    name: 'certificateVendor.useDefaultPolicy',
                    default: true,
                    askAnswered: true,
                },
                {
                    message:
                        'Enter the name of the policy to associate with certificates requested with a CSR:',
                    type: 'input',
                    name: 'certificateVendor.rotatedCertificatePolicy',
                    default: updatedAnswers.certificateVendor?.rotatedCertificatePolicy,
                    askAnswered: true,
                    when(answers: Answers) {
                        return (
                            answers.certificateVendor?.providingCSRs &&
                            answers.certificateVendor?.useDefaultPolicy
                        );
                    },
                    validate(answer: string) {
                        if ((answer?.length ?? 0) === 0) {
                            return `You must enter the policy name.`;
                        }
                        return true;
                    },
                },
                ...applicationConfigurationPrompt(this.name, answers, [
                    {
                        defaultConfiguration: 'certificates/',
                        propertyName: 'certificatesPrefix',
                        question: 'The key prefix where certificates are stored',
                    },
                    {
                        defaultConfiguration: '.zip',
                        propertyName: 'certificatesSuffix',
                        question: 'The key suffix where certificates are stored',
                    },
                    {
                        defaultConfiguration: 300,
                        propertyName: 'presignedUrlExpiryInSeconds',
                        question: 'S3 Presigned Url expiry in seconds',
                    },
                    {
                        defaultConfiguration: 'cdfRotateCertificates',
                        propertyName: 'rotateCertificatesThingGroup',
                        question:
                            'Change the name of the thing group if you want to use an alternate thing group.',
                    },
                    {
                        defaultConfiguration: 'cdf/certificates/{thingName}/get/accepted',
                        propertyName: 'getSuccessTopic',
                        question: 'MQTT Topic for Get Success',
                    },
                    {
                        defaultConfiguration: 'cdf/certificates/{thingName}/get/rejected',
                        propertyName: 'getFailureTopic',
                        question: 'MQTT Topic for Get Failure',
                    },
                    {
                        defaultConfiguration: 'cdf/certificates/+/get',
                        propertyName: 'getRootTopic',
                        question: 'MQTT Topic for Get Root',
                    },
                    {
                        defaultConfiguration: 'cdf/certificates/{thingName}/ack/accepted',
                        propertyName: 'ackSuccessTopic',
                        question: 'MQTT Topic for Ack Success',
                    },
                    {
                        defaultConfiguration: 'cdf/certificates/{thingName}/ack/rejected',
                        propertyName: 'ackFailureTopic',
                        question: 'MQTT Topic for Ack Failure',
                    },
                    {
                        defaultConfiguration: 'cdf/certificates/+/ack',
                        propertyName: 'ackRootTopic',
                        question: 'MQTT Topic for Ack Root',
                    },
                    {
                        defaultConfiguration: false,
                        propertyName: 'deletePreviousCertificate',
                        question:
                            'A feature toggle to enable deleting of the old certificate once rotated.',
                    },
                    {
                        defaultConfiguration: 'status',
                        propertyName: 'deviceStatusSuccessKey',
                        question:
                            'The key to use when updating the device state in the Device Registry or Asset Library',
                    },

                    {
                        defaultConfiguration: 'active',
                        propertyName: 'deviceStatusSuccessValue',
                        question:
                            'The value to use when updating the device state in the Device Registry or Asset Library',
                    },

                    {
                        defaultConfiguration: 1095,
                        propertyName: 'certificateExpiryInDays',
                        question:
                            'If creating a new certificate from a CSR, the expiration date to set.',
                    },

                    {
                        defaultConfiguration: 'AssetLibrary',
                        propertyName: 'registryMode',
                        question: 'Which data store to use to validate the status of a device',
                    },
                ]),
            ],
            updatedAnswers
        );

        return updatedAnswers;
    }

    private getParameterOverrides(answers: Answers): string[] {
        const parameterOverrides = [
            `Environment=${answers.environment}`,
            `BucketName=${answers.s3.bucket}`,
            `KmsKeyId=${answers.kms.id}`,
            `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
            `AssetLibraryFunctionName=${answers.certificateVendor.assetLibraryFunctionName}`,
            `CommandsFunctionName=${answers.certificateVendor.commandsFunctionName}`,
            `CustomResourceLambdaArn=${answers.deploymentHelper.lambdaArn}`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
            if (value !== undefined) parameterOverrides.push(`${key}=${value}`);
        };

        addIfSpecified('CaCertificateId', answers.certificateVendor.caCertificateId);
        addIfSpecified('AcmpcaCaArn', answers.certificateVendor.caArnAcmpca);
        addIfSpecified('AcmpcaEnabled', answers.certificateVendor.acmpcaEnabled);
        addIfSpecified('AcmpcaSigningAlgorithm', answers.certificateVendor.acmpcaSigningAlgorithm);
        addIfSpecified(
            'RotatedCertificatePolicy',
            answers.certificateVendor.rotatedCertificatePolicy
        );
        addIfSpecified(
            'ApplicationConfigurationOverride',
            this.generateApplicationConfiguration(answers)
        );
        addIfSpecified(
            'ACMPCACrossAccountRoleArn',
            answers.certificateVendor.acmpcaCrossAccountRoleArn
        );
        return parameterOverrides;
    }

    public async package(answers: Answers): Promise<[Answers, ListrTask[]]> {
        const monorepoRoot = await getMonorepoRoot();
        const tasks: ListrTask[] = [
            {
                title: `Packaging module '${this.name}'`,
                task: async () => {
                    await packageAndUploadTemplate({
                        answers: answers,
                        serviceName: 'certificatevendor',
                        templateFile: 'infrastructure/cfn-certificatevendor.yml',
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'services',
                            'certificatevendor'
                        ),
                        parameterOverrides: this.getParameterOverrides(answers),
                    });
                },
            },
        ];
        return [answers, tasks];
    }

    public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {
        ow(answers, ow.object.nonEmpty);
        ow(answers.certificateVendor, ow.object.nonEmpty);
        ow(answers.environment, ow.string.nonEmpty);
        ow(answers.s3.bucket, ow.string.nonEmpty);

        const monorepoRoot = await getMonorepoRoot();
        const tasks: ListrTask[] = [];

        if ((answers.certificateVendor.redeploy ?? true) === false) {
            return [answers, tasks];
        }

        tasks.push({
            title: `Detecting environment config for stack '${this.stackName}'`,
            task: async () => {
                if (answers.certificateVendor === undefined) {
                    answers.certificateVendor = {};
                }
                const assetlibrarybyResourceLogicalId = await getStackResourceSummaries(
                    this.assetLibraryStackName,
                    answers.region
                );
                const commandsbyResourceLogicalId = await getStackResourceSummaries(
                    this.commandAndControlStackName,
                    answers.region
                );
                answers.certificateVendor.commandsFunctionName =
                    commandsbyResourceLogicalId('RESTLambdaFunction');
                answers.certificateVendor.assetLibraryFunctionName =
                    assetlibrarybyResourceLogicalId('LambdaFunction');
            },
        });

        tasks.push({
            title: `Packaging and deploying stack '${this.stackName}'`,
            task: async () => {
                // If list is undefined it could be that we're deploying without prompt
                if (answers.certificateVendor?.pcaAliases === undefined) {
                    answers.certificateVendor.pcaAliases = await this.getPcaAliases(answers);
                }

                await packageAndDeployStack({
                    answers: answers,
                    stackName: this.stackName,
                    serviceName: 'certificatevendor',
                    templateFile: 'infrastructure/cfn-certificatevendor.yml',
                    cwd: path.join(
                        monorepoRoot,
                        'source',
                        'packages',
                        'services',
                        'certificatevendor'
                    ),
                    parameterOverrides: this.getParameterOverrides(answers),
                    needsPackaging: true,
                    needsCapabilityNamedIAM: true,
                });
            },
        });

        return [answers, tasks];
    }

    private generateApplicationConfiguration(answers: Answers): string {
        const configBuilder = new ConfigBuilder();

        if (answers.certificateVendor.setPcaAliases) {
            if (
                !answers.certificateVendor.pcaAliases.list.includes(
                    answers.certificateVendor.pcaAlias
                )
            ) {
                answers.certificateVendor.pcaAliases.cas?.push({
                    alias: answers.certificateVendor.pcaAlias,
                    value: answers.certificateVendor.pcaArn,
                });
            }
        }

        answers.certificateVendor.pcaAliases?.cas?.forEach((pca) => {
            let alias = pca.alias;

            if (alias == answers.certificateVendor.pcaAlias) {
                pca.value = answers.certificateVendor.pcaArn;
            }

            if (!pca.alias.startsWith('PCA_')) {
                alias = `PCA_${pca.alias.toUpperCase()}`;
            }

            configBuilder.add(alias, pca.value);
        });

        answers.certificateVendor.iotCaAliases?.cas?.forEach((ca) => {
            let alias = ca.alias;
            if (!ca.alias.startsWith('CA_')) {
                alias = `CA_${ca.alias.toUpperCase()}`;
            }
            if (alias == answers.certificateVendor.iotCaAlias) {
                ca.value = answers.certificateVendor.iotCaID;
            }
            configBuilder.add(alias, ca.value);
        });

        if ((answers?.certificateVendor?.acmpcaRegion?.length ?? 0) > 0) {
            configBuilder.add(`ACM_REGION`, answers.certificateVendor.acmpcaRegion);
        }
        configBuilder
            .add(`LOGGING_LEVEL`, answers.certificateVendor.loggingLevel)
            .add(`AWS_S3_CERTIFICATES_PREFIX`, answers.certificateVendor.certificatesPrefix)
            .add(`AWS_S3_CERTIFICATES_SUFFIX`, answers.certificateVendor.certificatesSuffix)
            .add(
                `AWS_S3_CERTIFICATES_PRESIGNEDURL_EXPIRESINSECONDS`,
                answers.certificateVendor.presignedUrlExpiryInSeconds
            )
            .add(
                `AWS_IOT_THINGGROUP_ROTATECERTIFICATES`,
                answers.certificateVendor.rotateCertificatesThingGroup
            )
            .add(`MQTT_TOPICS_GET_SUCCESS`, answers.certificateVendor.getSuccessTopic)
            .add(`MQTT_TOPICS_GET_FAILURE`, answers.certificateVendor.getFailureTopic)
            .add(`MQTT_TOPICS_GET_ROOT`, answers.certificateVendor.getRootTopic)
            .add(`MQTT_TOPICS_ACK_SUCCESS`, answers.certificateVendor.ackSuccessTopic)
            .add(`MQTT_TOPICS_ACK_FAILURE`, answers.certificateVendor.ackFailureTopic)
            .add(`MQTT_TOPICS_ACK_ROOT`, answers.certificateVendor.ackRootTopic)
            .add(
                `FEATURES_DELETEPREVIOUSCERTIFICATE`,
                answers.certificateVendor.deletePreviousCertificate
            )
            .add(
                `DEFAULTS_DEVICE_STATUS_SUCCESS_KEY`,
                answers.certificateVendor.deviceStatusSuccessKey
            )
            .add(
                `DEFAULTS_DEVICE_STATUS_SUCCESS_VALUE`,
                answers.certificateVendor.deviceStatusSuccessValue
            )
            .add(
                `DEFAULTS_CERTIFICATES_CERTIFICATEEXPIRYDAYS`,
                answers.certificateVendor.certificateExpiryInDays
            )
            .add('USE_DEFAULT_POLICY', answers.certificateVendor.useDefaultPolicy)
            .add(`REGISTRY_MODE`, answers.certificateVendor.registryMode);

        return configBuilder.config;
    }

    public async delete(answers: Answers): Promise<ListrTask[]> {
        const tasks: ListrTask[] = [];
        tasks.push({
            title: `Deleting stack '${this.stackName}'`,
            task: async () => {
                await deleteStack(this.stackName, answers.region);
            },
        });
        return tasks;
    }

    private async getPcaAliases(answers: Answers): Promise<CAAliases> {
        const lambda = new Lambda({ region: answers.region });
        let aliases: CAAliases;
        if (answers?.certificateVendor?.pcaAliases === undefined) {
            aliases = { list: [], cas: [] };
        } else {
            aliases = answers.certificateVendor.pcaAliases;
            aliases.list = aliases.cas?.map((ca) => ca.alias) ?? [];
        }
        try {
            // append lambda ACM PCA Config to list if none are present in the configuration file
            if (aliases.list.length == 0) {
                const config = await lambda.getFunctionConfiguration({
                    FunctionName: `cdf-certificateVendor-${answers.environment}`,
                });
                const variables = config.Environment?.Variables;
                const appConfigStr = variables['APP_CONFIG'] as string;
                appConfigStr.split('\r\n').forEach((element) => {
                    if (element.startsWith('PCA_')) {
                        const [key, value] = element.split('=');
                        const alias = key.replace('PCA_', '');

                        if (!aliases.list.includes(alias)) {
                            aliases.list.push(alias);
                            aliases.cas.push({ alias, value });
                        }
                    }
                });
            }
        } catch (e) {
            e.name === 'ResourceNotFoundException' && console.log(`No suppliers found`);
        }
        if (aliases.list.length == 0 || !aliases.list.includes('Create New PCA Alias')) {
            aliases.list.push('Create New PCA Alias');
        }
        return aliases;
    }

    private async getIotCaAliases(answers: Answers): Promise<CAAliases> {
        const lambda = new Lambda({ region: answers.region });
        let aliases: CAAliases;

        if (answers?.certificateVendor?.iotCaAliases === undefined) {
            aliases = { list: [], cas: [] };
        } else {
            aliases = answers.certificateVendor.iotCaAliases;
            aliases.list = aliases.cas?.map((ca) => ca.alias) ?? [];
        }

        // append lambda IoT CA list if none are present in the configuration file
        try {
            if (aliases.list.length == 0) {
                const config = await lambda.getFunctionConfiguration({
                    FunctionName: `cdf-certificateVendor-${answers.environment}`,
                });
                const variables = config.Environment?.Variables;
                const appConfigStr = variables['APP_CONFIG'] as string;
                appConfigStr.split('\r\n').forEach((element) => {
                    if (element.startsWith('CA_')) {
                        const [key, value] = element.split('=');
                        const alias = key.replace('CA_', '');

                        if (!aliases.list.includes(alias)) {
                            aliases.list.push(alias);
                            aliases.cas.push({ alias, value });
                        }
                    }
                });
            }
        } catch (e) {
            e.name === 'ResourceNotFoundException' && console.log(`No suppliers found`);
        }
        if (aliases.list.length == 0 || !aliases.list.includes('Create New AWS IoT CA alias')) {
            aliases.list.push('Create New AWS IoT CA alias');
        }
        return aliases;
    }

    private getPCAPrompt(answers: Answers, pcaAliases: CAAliases): Question[] {
        const questions = [
            {
                message: 'Select the ACM PCA aliases you wish to modify',
                type: 'list',
                name: 'certificateVendor.pcaAlias',
                choices: pcaAliases.list,
                pageSize: 20,
                loop: false,
                askAnswered: true,
                default: pcaAliases.list.length - 1,
                validate(answer: string[]) {
                    if (answer?.length === 0) {
                        return false;
                    }
                    return true;
                },
                when(answers: Answers) {
                    return (
                        answers.certificateVendor?.setPcaAliases === true &&
                        pcaAliases.list?.length > 1
                    );
                },
            },
            {
                message: `No ACM PCA alias was found. Create a new alias ?`,
                type: 'confirm',
                name: 'certificateVendor.setPcaAliases',
                default: answers.certificateVendor?.setPcaAliases ?? true,
                askAnswered: true,
                when(answers: Answers) {
                    return (
                        answers.certificateVendor?.setPcaAliases === true &&
                        pcaAliases.list?.length === 1
                    );
                },
            },
            {
                message: `Enter new ACM PCA alias name:`,
                type: 'input',
                name: 'certificateVendor.pcaAlias',
                default: answers.certificateVendor?.pcaAlias,
                askAnswered: true,
                validate(answer: string[]) {
                    if (answer?.length === 0) {
                        return false;
                    }
                    return true;
                },
                when(answers: Answers) {
                    return (
                        answers.certificateVendor?.setPcaAliases === true &&
                        (answers.certificateVendor.pcaAliases.list?.length === 1 ||
                            answers.certificateVendor.pcaAlias === 'Create New PCA Alias')
                    );
                },
            },
            {
                message: `ACM PCA ARN:`,
                type: 'input',
                name: 'certificateVendor.pcaArn',
                default: answers.certificateVendor?.pcaArn,
                askAnswered: true,
                validate(answer: string) {
                    return CommonArnValidations.validateAcmPcaArn(answer);
                },
                when(answers: Answers) {
                    return answers.certificateVendor?.setPcaAliases === true;
                },
            },
            {
                message: 'Are you finished modifying the ACM PCA List?',
                type: 'confirm',
                name: 'certificateVendor.pcaFinished',
                default: answers.certificateVendor?.pcaFinished ?? true,
                askAnswered: true,
                when(answers: Answers) {
                    return answers.certificateVendor?.setPcaAliases === true;
                },
            },
        ];
        return questions;
    }

    private getIoTCAPrompt(answers: Answers, iotCaAliases: CAAliases): Question[] {
        const questions = [
            {
                message: 'Select the AWS IoT CA aliases you wish to modify',
                type: 'list',
                name: 'certificateVendor.iotCaAlias',
                choices: iotCaAliases.list,
                pageSize: 20,
                loop: false,
                askAnswered: true,
                default: iotCaAliases.list.length - 1,
                validate(answer: string[]) {
                    if (answer?.length === 0) {
                        return false;
                    }
                    return true;
                },
                when(answers: Answers) {
                    return (
                        answers.certificateVendor?.setIotCaAliases === true &&
                        iotCaAliases.list?.length > 1
                    );
                },
            },
            {
                message: `No AWS IoT CA alias was found. Create a new alias ?`,
                type: 'confirm',
                name: 'certificateVendor.setIotCaAliases',
                default: answers.certificateVendor?.setIotCaAliases ?? true,
                askAnswered: true,
                when(answers: Answers) {
                    return (
                        answers.certificateVendor?.setIotCaAliases === true &&
                        iotCaAliases.list?.length === 1
                    );
                },
            },
            {
                message: `Enter new AWS IoT CA alias name:`,
                type: 'input',
                name: 'certificateVendor.iotCaAlias',
                default: answers.certificateVendor?.iotCaAlias,
                askAnswered: true,
                validate(answer: string[]) {
                    if (answer?.length === 0) {
                        return false;
                    }
                    return true;
                },
                when(answers: Answers) {
                    return (
                        answers.certificateVendor?.setIotCaAliases === true &&
                        (answers.certificateVendor.iotCaAliases.list?.length === 1 ||
                            answers.certificateVendor.iotCaAlias === 'Create New AWS IoT CA alias')
                    );
                },
            },
            {
                message: `AWS IoT CA ID:`,
                type: 'input',
                name: 'certificateVendor.iotCaID',
                default: answers.certificateVendor?.iotCaID,
                askAnswered: true,
                validate(answer: string) {
                    return CommonArnValidations.validateAwsIotCaID(answer);
                },
                when(answers: Answers) {
                    return answers.certificateVendor?.setIotCaAliases === true;
                },
            },
            {
                message: 'Are you finished modifying the IoT CA List?',
                type: 'confirm',
                name: 'certificateVendor.iotCaFinished',
                default: answers.certificateVendor?.iotCaFinished ?? true,
                askAnswered: true,
                when(answers: Answers) {
                    return answers.certificateVendor?.setIotCaAliases === true;
                },
            },
        ];
        return questions;
    }
}
