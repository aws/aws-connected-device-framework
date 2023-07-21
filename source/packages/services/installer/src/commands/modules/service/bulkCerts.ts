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
import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';
import path from 'path';
import { Answers, BulkCerts, CAAliases } from '../../../models/answers';
import { ModuleName, PostmanEnvironment, RestModule } from '../../../models/modules';
import { applicationConfigurationPrompt } from '../../../prompts/applicationConfiguration.prompt';
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { getMonorepoRoot } from '../../../prompts/paths.prompt';
import {
    deleteStack,
    getStackOutputs,
    packageAndDeployStack,
    packageAndUploadTemplate,
} from '../../../utils/cloudformation.util';
import { ConfigBuilder } from '../../../utils/configBuilder';

export class BulkCertificatesInstaller implements RestModule {
    public readonly friendlyName = 'Bulk Certificates';
    public readonly name = 'bulkCerts';
    public readonly localProjectDir = 'bulkcerts';

    public readonly type = 'SERVICE';
    public readonly dependsOnMandatory: ModuleName[] = ['apigw', 'kms', 'openSsl'];

    public readonly dependsOnOptional: ModuleName[] = [];

    public readonly stackName: string;

    constructor(environment: string) {
        this.stackName = `cdf-bulkcerts-${environment}`;
    }

    public async prompts(answers: Answers): Promise<Answers> {
        delete answers.bulkCerts?.redeploy;
        let updatedAnswers: Answers = await inquirer.prompt(
            [redeployIfAlreadyExistsPrompt(this.name, this.stackName)],
            answers
        );
        if ((updatedAnswers.bulkCerts?.redeploy ?? true) === false) {
            return updatedAnswers;
        }

        const suppliers = await this.getSuppliers(answers);

        if (updatedAnswers.bulkCerts === undefined) {
            updatedAnswers.bulkCerts = {} as BulkCerts;
        }

        updatedAnswers.bulkCerts.suppliers = suppliers;

        updatedAnswers = await inquirer.prompt(
            [
                {
                    message: `Create or modify supplier CA alias ?`,
                    type: 'confirm',
                    name: 'bulkCerts.setSupplier',
                    default: answers.bulkCerts?.setSupplier ?? true,
                    askAnswered: true,
                },
                {
                    message: 'Select the suppliers you wish to modify',
                    type: 'list',
                    name: 'bulkCerts.caAlias',
                    choices: suppliers.list,
                    pageSize: 20,
                    loop: false,
                    askAnswered: true,
                    default: suppliers.list.length - 1,
                    validate(answer: string[]) {
                        if (answer?.length === 0) {
                            return false;
                        }
                        return true;
                    },
                    when(answers: Answers) {
                        return (
                            answers.bulkCerts?.setSupplier === true && suppliers.list?.length > 1
                        );
                    },
                },
                {
                    message: `No supplier was found, Create a new alias ?`,
                    type: 'confirm',
                    name: 'bulkCerts.setSupplier',
                    default: answers.bulkCerts?.setSupplier ?? true,
                    askAnswered: true,
                    when(answers: Answers) {
                        return (
                            answers.bulkCerts?.setSupplier === true && suppliers.list?.length === 1
                        );
                    },
                },
                {
                    message: `Enter new supplier alias:`,
                    type: 'input',
                    name: 'bulkCerts.caAlias',
                    default: answers.bulkCerts?.caAlias,
                    askAnswered: true,
                    validate(answer: string[]) {
                        if (answer?.length === 0) {
                            return false;
                        }
                        return true;
                    },
                    when(answers: Answers) {
                        return (
                            answers.bulkCerts?.setSupplier === true &&
                            (answers.bulkCerts.suppliers.list?.length === 1 ||
                                answers.bulkCerts.caAlias === 'Create New Supplier')
                        );
                    },
                },
                {
                    message: `Supplier CA value:`,
                    type: 'input',
                    name: 'bulkCerts.caValue',
                    default: answers.bulkCerts?.caValue,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.bulkCerts?.setSupplier === true;
                    },
                },
                {
                    message:
                        'Would you like to provide any default values for the device certificates?',
                    type: 'confirm',
                    name: 'bulkCerts.setCertificateDefaults',
                    default: answers.bulkCerts?.setCertificateDefaults ?? true,
                    askAnswered: true,
                },
                {
                    message: `Default certificate common name (leave blank to skip):`,
                    type: 'input',
                    name: 'bulkCerts.commonName',
                    default: answers.bulkCerts?.commonName,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.bulkCerts?.setCertificateDefaults === true;
                    },
                },
                {
                    message: `Default certificate organization (leave blank to skip):`,
                    type: 'input',
                    name: 'bulkCerts.organization',
                    default: answers.bulkCerts?.organization,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.bulkCerts?.setCertificateDefaults === true;
                    },
                },
                {
                    message: `Default certificate organizational unit (leave blank to skip):`,
                    type: 'input',
                    name: 'bulkCerts.organizationalUnit',
                    default: answers.bulkCerts?.organizationalUnit,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.bulkCerts?.setCertificateDefaults === true;
                    },
                },
                {
                    message: `Default certificate locality (leave blank to skip):`,
                    type: 'input',
                    name: 'bulkCerts.locality',
                    default: answers.bulkCerts?.locality,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.bulkCerts?.setCertificateDefaults === true;
                    },
                },
                {
                    message: `Default certificate state name (leave blank to skip):`,
                    type: 'input',
                    name: 'bulkCerts.stateName',
                    default: answers.bulkCerts?.stateName,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.bulkCerts?.setCertificateDefaults === true;
                    },
                },
                {
                    message: `Default certificate country (leave blank to skip):`,
                    type: 'input',
                    name: 'bulkCerts.country',
                    default: answers.bulkCerts?.country,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.bulkCerts?.setCertificateDefaults === true;
                    },
                },
                {
                    message: `Default certificate email address (leave blank to skip):`,
                    type: 'input',
                    name: 'bulkCerts.emailAddress',
                    default: answers.bulkCerts?.emailAddress,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.bulkCerts?.setCertificateDefaults === true;
                    },
                },
                {
                    message: `Default certificate distinguished name identifier (leave blank to skip):`,
                    type: 'input',
                    name: 'bulkCerts.distinguishedNameIdentifier',
                    default: answers.bulkCerts?.distinguishedNameIdentifier,
                    askAnswered: true,
                    when(answers: Answers) {
                        return answers.bulkCerts?.setCertificateDefaults === true;
                    },
                },
                ...applicationConfigurationPrompt(this.name, answers, [
                    {
                        question: 'Default certificate expiry days (leave blank to skip):',
                        defaultConfiguration: 365,
                        propertyName: 'expiryDays',
                    },
                    {
                        question:
                            'The chunk size that the number of requested certificates are split into',
                        defaultConfiguration: 100,
                        propertyName: 'chunksize',
                    },
                    {
                        question:
                            'Default number of concurrent threads for issuing ACM certificates:',
                        defaultConfiguration: 10,
                        propertyName: 'acmConcurrencyLimit',
                    },
                ]),
                ...customDomainPrompt(this.name, answers),
            ],
            updatedAnswers
        );

        return updatedAnswers;
    }

    private getParameterOverrides(answers: Answers): string[] {
        const parameterOverrides = [
            `Environment=${answers.environment}`,
            `TemplateSnippetS3UriBase=${answers.apigw.templateSnippetS3UriBase}`,
            `AuthType=${answers.apigw.type}`,
            `ApiGatewayDefinitionTemplate=${answers.apigw.cloudFormationTemplate}`,
            `VpcId=${answers.vpc?.id ?? 'N/A'}`,
            `CDFSecurityGroupId=${answers.vpc?.securityGroupId ?? ''}`,
            `PrivateSubNetIds=${answers.vpc?.privateSubnetIds ?? ''}`,
            `PrivateApiGatewayVPCEndpoint=${answers.vpc?.privateApiGatewayVpcEndpoint ?? ''}`,
            `KmsKeyId=${answers.kms.id}`,
            `OpenSslLambdaLayerArn=${answers.openSsl.arn}`,
            `BucketName=${answers.s3.bucket}`,
            `BucketKeyPrefix=certificates/`,
        ];

        const addIfSpecified = (key: string, value: unknown) => {
            if (value !== undefined) parameterOverrides.push(`${key}=${value}`);
        };

        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified(
            'ApplicationConfigurationOverride',
            this.generateApplicationConfiguration(answers)
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
                        serviceName: 'bulkcerts',
                        templateFile: 'infrastructure/cfn-bulkcerts.yml',
                        cwd: path.join(
                            monorepoRoot,
                            'source',
                            'packages',
                            'services',
                            'bulkcerts'
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
        ow(answers.apigw, ow.object.nonEmpty);
        ow(answers.bulkCerts, ow.object.nonEmpty);
        ow(answers.environment, ow.string.nonEmpty);
        ow(answers.region, ow.string.nonEmpty);
        ow(answers.openSsl?.arn, ow.string.nonEmpty);
        ow(answers.s3?.bucket, ow.string.nonEmpty);

        const monorepoRoot = await getMonorepoRoot();
        const tasks: ListrTask[] = [];

        if ((answers.bulkCerts.redeploy ?? true) === false) {
            return [answers, tasks];
        }

        tasks.push({
            title: `Packaging and deploying stack '${this.stackName}'`,
            task: async () => {
                await packageAndDeployStack({
                    answers: answers,
                    stackName: this.stackName,
                    serviceName: 'bulkcerts',
                    templateFile: 'infrastructure/cfn-bulkcerts.yml',
                    cwd: path.join(monorepoRoot, 'source', 'packages', 'services', 'bulkcerts'),
                    parameterOverrides: this.getParameterOverrides(answers),
                    needsPackaging: true,
                    needsCapabilityNamedIAM: true,
                    needsCapabilityAutoExpand: true,
                });
            },
        });

        return [answers, tasks];
    }

    public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
        const byOutputKey = await getStackOutputs(this.stackName, answers.region);
        return {
            key: 'bulkcerts_base_url',
            value: byOutputKey('ApiGatewayUrl'),
            enabled: true,
        };
    }

    private generateApplicationConfiguration(answers: Answers): string {
        const configBuilder = new ConfigBuilder();

        if (answers.bulkCerts.setSupplier) {
            if (!answers.bulkCerts.suppliers.list.includes(answers.bulkCerts.caAlias)) {
                answers.bulkCerts.suppliers.cas.push({
                    alias: answers.bulkCerts.caAlias,
                    value: answers.bulkCerts.caValue,
                });
            }
            answers.bulkCerts.suppliers.cas.forEach((supplier) => {
                let alias = supplier.alias;
                if (!supplier.alias.startsWith('SUPPLIER_CA_')) {
                    alias = `SUPPLIER_CA_${supplier.alias.toUpperCase()}`;
                }
                if (alias == answers.bulkCerts.caAlias) {
                    supplier.value = answers.bulkCerts.caValue;
                }
                configBuilder.add(alias, supplier.value);
            });
        }

        configBuilder
            .add(`CUSTOMDOMAIN_BASEPATH`, answers.bulkCerts.customDomainBasePath)
            .add(`LOGGING_LEVEL`, answers.bulkCerts.loggingLevel)
            .add(`CORS_ORIGIN`, answers.apigw.corsOrigin)
            .add(`CERTIFICATE_DEFAULT_COMMONNAME`, answers.bulkCerts.commonName)
            .add(`CERTIFICATE_DEFAULT_ORGANIZATION`, answers.bulkCerts.organization)
            .add(`CERTIFICATE_DEFAULT_ORGANIZATIONALUNIT`, answers.bulkCerts.organizationalUnit)
            .add(`CERTIFICATE_DEFAULT_LOCALITY`, answers.bulkCerts.locality)
            .add(`CERTIFICATE_DEFAULT_STATENAME`, answers.bulkCerts.stateName)
            .add(`CERTIFICATE_DEFAULT_COUNTRY`, answers.bulkCerts.country)
            .add(`CERTIFICATE_DEFAULT_EMAILADDRESS`, answers.bulkCerts.emailAddress)
            .add(
                `CERTIFICATE_DEFAULT_DISTINGUISHEDNAMEQUALIFIER`,
                answers.bulkCerts.distinguishedNameIdentifier
            )
            .add(`CERTIFICATE_DEFAULT_EXPIRYDAYS`, answers.bulkCerts.expiryDays)
            .add(`DEFAULTS_CHUNKSIZE`, answers.bulkCerts.chunksize)
            .add(`AWS_ACM_CONCURRENCY_LIMIT`, answers.bulkCerts.acmConcurrencyLimit);
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

    private async getSuppliers(answers: Answers): Promise<CAAliases> {
        const lambda = new Lambda({ region: answers.region });
        let suppliers: CAAliases;

        if (
            typeof answers === 'undefined' ||
            typeof answers.bulkCerts === 'undefined' ||
            typeof answers.bulkCerts.suppliers === 'undefined'
        ) {
            suppliers = { list: [], cas: [] };
        } else {
            suppliers = answers.bulkCerts.suppliers;
            suppliers['list'] = [];
            for (const ca of suppliers.cas) {
                suppliers.list.push(ca.alias);
            }
        }

        //append lambda suppliers if none are present in the config
        try {
            const config = await lambda.getFunctionConfiguration({
                FunctionName: `cdf-bulkCerts-sns-${answers.environment}`,
            });
            const variables = config.Environment?.Variables;
            const appConfigStr = variables['APP_CONFIG'] as string;
            appConfigStr.split('\r\n').forEach((element) => {
                if (element.startsWith('SUPPLIER_CA_')) {
                    const [key, value] = element.split('=');
                    const alias = key.replace('SUPPLIER_CA_', '');

                    if (!suppliers.list.includes(alias)) {
                        suppliers.list.push(alias);
                        suppliers.cas.push({ alias, value });
                    }
                }
            });
        } catch (e) {
            e.name === 'ResourceNotFoundException' && console.log(`No suppliers found`);
        }
        if (suppliers.list.length == 0 || !suppliers.list.includes('Create New Supplier')) {
            suppliers.list.push('Create New Supplier');
        }
        return suppliers;
    }
}
