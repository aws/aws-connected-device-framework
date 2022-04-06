import { Answers, CA, Suppliers } from '../../../models/answers';
import { ListrTask } from 'listr2';
import { ModuleName, RestModule, PostmanEnvironment } from '../../../models/modules';
import { ConfigBuilder } from "../../../utils/configBuilder";
import inquirer from 'inquirer';
import ow from 'ow';
import execa from 'execa';
import { customDomainPrompt } from '../../../prompts/domain.prompt';
import { redeployIfAlreadyExistsPrompt } from '../../../prompts/modules.prompt';
import { applicationConfigurationPrompt } from "../../../prompts/applicationConfiguration.prompt";
import { deleteStack, getStackOutputs, getStackParameters, getStackResourceSummaries } from '../../../utils/cloudformation.util';
import { Lambda } from '@aws-sdk/client-lambda'

export class BulkCertificatesInstaller implements RestModule {

  public readonly friendlyName = 'Bulk Certificates';
  public readonly name = 'bulkCerts';

  public readonly type = 'SERVICE';
  public readonly dependsOnMandatory: ModuleName[] = [
    'apigw',
    'kms',
    'openSsl'];
  public readonly dependsOnOptional: ModuleName[] = ['vpc', 'authJwt'];

  private readonly stackName: string;

  constructor(environment: string) {

    this.stackName = `cdf-bulkcerts-${environment}`

  }

  public async prompts(answers: Answers): Promise<Answers> {

    delete answers.bulkCerts?.redeploy;
    let updatedAnswers: Answers = await inquirer.prompt([
      redeployIfAlreadyExistsPrompt(this.name, this.stackName),
    ], answers);
    if ((updatedAnswers.bulkCerts?.redeploy ?? true) === false) {
      return updatedAnswers;
    }

    const suppliers = await this.getSuppliers(answers);
    updatedAnswers.bulkCerts.suppliers = suppliers;

    updatedAnswers = await inquirer.prompt([
      {
        message: `Create or modify supplier CA alias :`,
        type: 'confirm',
        name: 'bulkCerts.setSupplier',
        default: answers.bulkCerts?.setSupplier ?? true,
        askAnswered: true
      },
      {
        message: 'Select the suppliers you wish to modify',
        type: 'list',
        name: 'bulkCerts.caAlias',
        choices:  suppliers.list,
        pageSize: 20,
        loop: false,
        askAnswered: true,
        default: suppliers.list.length -1 ,
        validate(answer:string[]) {
          if (answer?.length===0) {
             return false;
          }
          return true;
        },
        when(answers: Answers) {
          return answers.bulkCerts?.setSupplier === true && suppliers.list?.length > 1;
        }
      },
      {
        message: `No supplier was found, Create a new alias :`,
        type: 'confirm',
        name: 'bulkCerts.setSupplier',
        default: answers.bulkCerts?.setSupplier ?? true,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setSupplier === true && suppliers.list?.length === 1;
        },
      },
      {
        message: `Enter new supplier alias, must follow the format "SUPPLIER_CA_{alias}":`,
        type: 'input',
        name: 'bulkCerts.caAlias',
        default: answers.bulkCerts?.caAlias,
        askAnswered: true,
        validate(answer:string) {
          if (! answer.startsWith('SUPPLIER_CA_')) {
             return "Alias must start with SUPPLIER_CA_";
          }
          return true;
        },
        when(answers: Answers) {
          return answers.bulkCerts?.setSupplier === true && (answers.bulkCerts.suppliers.list?.length === 1 || answers.bulkCerts.caAlias === "Create New Supplier") ;
        },
      },
      {
        message: `Supplier CA Id:`,
        type: 'input',
        name: 'bulkCerts.caId',
        default: answers.bulkCerts?.caId,
        askAnswered: true,
        when(answers: Answers) {
          return answers.bulkCerts?.setSupplier === true;
        },
      },
      {
        message: 'Would you like to provide any default values for the device certificates?',
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
          propertyName: 'expiryDays'
        },
        {
          question: 'The chunk size that the number of requested certificates are split into',
          defaultConfiguration: 100,
          propertyName: 'chunksize'
        }]),
      ...customDomainPrompt(this.name, answers),
    ], updatedAnswers);

    return updatedAnswers;


  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.nonEmpty);
    ow(answers.apigw, ow.object.nonEmpty);
    ow(answers.bulkCerts, ow.object.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.region, ow.string.nonEmpty);
    ow(answers.openSsl?.arn, ow.string.nonEmpty);
    ow(answers.s3?.bucket, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    if ((answers.bulkCerts.redeploy ?? true) === false) {
      return [answers, tasks];
    }

    tasks.push({
      title: `Packaging stack '${this.stackName}'`,
      task: async () => {
        await execa('aws', ['cloudformation', 'package',
          '--template-file', '../bulkcerts/infrastructure/cfn-bulkcerts.yml',
          '--output-template-file', '../bulkcerts/infrastructure/cfn-bulkcerts.yml.build',
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
        ]

        const addIfSpecified = (key: string, value: unknown) => {
          if (value !== undefined) parameterOverrides.push(`${key}=${value}`)
        };

        addIfSpecified('CognitoUserPoolArn', answers.apigw.cognitoUserPoolArn);
        addIfSpecified('AuthorizerFunctionArn', answers.apigw.lambdaAuthorizerArn);
        addIfSpecified('ApplicationConfigurationOverride', this.generateApplicationConfiguration(answers));

        await execa('aws', ['cloudformation', 'deploy',
          '--template-file', '../bulkcerts/infrastructure/cfn-bulkcerts.yml.build',
          '--stack-name', this.stackName,
          '--parameter-overrides', ...parameterOverrides,
          '--capabilities', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND',
          '--no-fail-on-empty-changeset',
          '--region', answers.region
        ]);
      }
    });

    return [answers, tasks];
  }

  public async generatePostmanEnvironment(answers: Answers): Promise<PostmanEnvironment> {
      const byOutputKey = await getStackOutputs(this.stackName, answers.region)
      return {
        key: 'bulkcerts_base_url',
        value: byOutputKey('ApiGatewayUrl'),
        enabled: true
      }
  }

  public generateApplicationConfiguration(answers: Answers): string {
    const configBuilder = new ConfigBuilder()

    if(!answers.bulkCerts.suppliers.list.includes(answers.bulkCerts.caAlias)){
      answers.bulkCerts?.suppliers?.cas.push({alias:answers.bulkCerts.caAlias, caId:answers.bulkCerts.caId});
    }
    answers.bulkCerts?.suppliers?.cas?.forEach(supplier => {
      if( supplier.alias == answers.bulkCerts.caAlias){
        supplier.caId = answers.bulkCerts.caId;
      }
      configBuilder.add(supplier.alias,supplier.caId);
    });

    
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
      .add(`CERTIFICATE_DEFAULT_DISTINGUISHEDNAMEQUALIFIER`, answers.bulkCerts.distinguishedNameIdentifier)
      .add(`CERTIFICATE_DEFAULT_EXPIRYDAYS`, answers.bulkCerts.expiryDays)
      .add(`DEFAULTS_CHUNKSIZE`, answers.bulkCerts.chunksize)

    return configBuilder.config;
  }


  public async generateLocalConfiguration(answers: Answers): Promise<string> {
    const byParameterKey = await getStackParameters(this.stackName, answers.region)
    const byResourceLogicalId = await getStackResourceSummaries(this.stackName, answers.region)

    const configBuilder = new ConfigBuilder()

    configBuilder
      .add(`AWS_DYNAMODB_TASKS_TABLENAME`, byResourceLogicalId('BulkCertificatesTaskTable'))
      .add(`AWS_S3_CERTIFICATES_BUCKET`, byParameterKey('BucketName'))
      .add(`AWS_S3_CERTIFICATES_PREFIX`, byParameterKey('BucketKeyPrefix'))
      .add(`EVENTS_REQUEST_TOPIC`, byResourceLogicalId('CertificatesRequestSnsTopic'))

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

private async getSuppliers(answers:Answers): Promise<Suppliers> {
  const lambda = new Lambda({ region: answers.region });
  const config = await lambda.getFunctionConfiguration({ FunctionName: `cdf-bulkCerts-sns-${answers.environment}` });
  const list:string[] = [];
  const cas:CA[] = [];
  const variables = config.Environment?.Variables;
  const appConfigStr = variables['APP_CONFIG'] as string;
  appConfigStr.split('\r\n').forEach(element => {
    if(element.startsWith('SUPPLIER_CA_')) {
      const [key,value] = element.split('=');
      list.push(key);
      cas.push({alias:key, caId:value});
    }
  });
  list.push("Create New Supplier");
  const suppliers:Suppliers = {list,cas};
  return suppliers;
}
}
