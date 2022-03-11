import * as fs from 'fs';
import inquirer from 'inquirer';
import { ListrTask } from 'listr2';
import ow from 'ow';
import path from 'path';

import { Answers, ApiAuthenticationType } from '../../../models/answers';
import { InfrastructureModule, ModuleName } from '../../../models/modules';
import { getAbsolutePath, getMonorepoRoot, pathPrompt } from '../../../prompts/paths.prompt';
import { S3Utils } from '../../../utils/s3.util';

export class ApiGwInstaller implements InfrastructureModule {

  public readonly friendlyName = 'API Gateway';
  public readonly name = 'apigw';
  public readonly dependsOnMandatory: ModuleName[] = [];
  public dependsOnOptional: ModuleName[] = [];
  public readonly type = 'INFRASTRUCTURE';

  public async prompts(answers: Answers): Promise<Answers> {


    answers = await inquirer.prompt([

      // choose location where cloudformation snippets are stored
      pathPrompt(
        'Some of the modules chosen expose a REST API. Select the path to where the REST API CloudFormation snippets are stored (relative from aws-connected-device-framework repository) :',
        'apigw.cloudFormationSnippetsPath',
        answers.apigw?.cloudFormationSnippetsPath ?? path.join('source', 'infrastructure', 'cloudformation', 'snippets')),

      // choose the type of rest api auth
      {
        message: 'What kind of authentication do you want to apply?',
        type: 'list',
        name: 'apigw.type',
        default: answers.apigw?.type || 'None',
        choices: [
          { key: 'None', value: 'None' },
          { key: 'Private API Gateway', value: 'Private' },
          { key: 'Cognito', value: 'Cognito' },
          { key: 'LambdaRequest Authorizer', value: 'LambdaRequest' },
          { key: 'LambdaToken Authorizer', value: 'LambdaToken' },
          { key: 'API Key', value: 'ApiKey' },
          { key: 'IAM', value: 'IAM' }
        ],
        pageSize: 10,
        loop: false,
        askAnswered: true,
        validate(answer: string) {
          if (answer?.length === 0) {
            return 'You must choose an authentication method.';
          }
          return true;
        },
      },

      // a CloudFormation snippet is required to manage the apigw config...
      {
        message: 'Enter the name of the CloudFormation snippet that configures the REST APIs:',
        type: 'input',
        name: 'apigw.cloudFormationTemplate',
        default: () => {
          let cloudformationTemplate = 'cfn-apiGateway-noAuth.yaml'
          switch (answers.apigw?.type) {
            case "ApiKey":
              cloudformationTemplate = 'cfn-apiGateway-apiKeyAuth.yaml'
              break;
            case "Cognito":
              cloudformationTemplate = 'cfn-apiGateway-cognitoAuth.yaml'
              break;
            case "IAM":
              cloudformationTemplate = 'cfn-apiGateway-iamAuth.yaml'
              break;
            case "LambdaRequest":
              cloudformationTemplate = 'cfn-apiGateway-lambdaRequestAuth.yaml'
              break
            case "LambdaToken":
              cloudformationTemplate = 'cfn-apiGateway-lambdaTokenAuth.yaml'
              break
            case "None":
              cloudformationTemplate = 'cfn-apiGateway-noAuth.yaml'
              break
            case "Private":
              cloudformationTemplate = 'cfn-apiGateway-privateApi.yaml'
              break
          }
          return cloudformationTemplate;

        },
        askAnswered: true,
        validate(answer: string) {
          if (answer?.length === 0) {
            return `You must enter the name of the CloudFormation snippet.`;
          }
          return true;
        },
      },

      {
        message: 'Enter the name of Cognito  user pool arn:',
        type: 'input',
        name: 'apigw.cognitoUserPoolArn',
        default: answers.apigw?.cognitoUserPoolArn,
        askAnswered: true,
        when(answers: Answers) {
          return answers.apigw?.type === 'Cognito'
        },
        validate(answer: string) {
          if (answer?.length === 0) {
            return `You must enter the name of the Cognito user pool arn.`;
          }
          return true;
        },
      },

      {
        message: 'Use existing lambda authorizer:',
        type: 'input',
        name: 'apigw.useExistingLambdaAuthorizer',
        default: answers.apigw?.useExistingLambdaAuthorizer,
        askAnswered: true,
        when(answers: Answers) {
          return (answers.apigw?.type === 'LambdaRequest' || answers.apigw?.type === 'LambdaToken')
        }
      },

      {
        message: 'Enter the name of Lambda Authorizer Arn:',
        type: 'input',
        name: 'apigw.lambdaAuthorizerArn',
        default: answers.apigw?.lambdaAuthorizerArn,
        askAnswered: true,
        when(answers: Answers) {
          return (answers.apigw?.useExistingLambdaAuthorizer ?? false)
        },
        validate(answer: ApiAuthenticationType) {
          if (answer?.length === 0) {
            return `You must enter the name of the Lambda Authorizer arn.`;
          }
          return true;
        },
      },

      // TODO: Use existing cognito? Or deploy a Cognito user pool specifically for CDF?
      {
        message: 'Configure Cross-Origin Resource Sharing (CORS)?',
        type: 'confirm',
        name: 'apigw.corsEnable',
        default: answers.apigw?.corsEnable ?? false,
        askAnswered: true,
      },
      {
        message: 'Specify domain for CORS origin',
        type: 'input',
        name: 'apigw.corsOrigin',
        default: answers.apigw?.corsOrigin ?? "*",
        when(answers: Answers) {
          return (answers.apigw?.corsEnable ?? false)
        },
        askAnswered: true,
      },

    ], answers);

    if ((answers.apigw?.type ?? '') === 'None') {
      // TODO potentially remove old ansers
    }

    return answers;

  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {

    ow(answers, ow.object.plain);
    ow(answers.s3.bucket, ow.string.nonEmpty);
    ow(answers.environment, ow.string.nonEmpty);
    ow(answers.apigw.cloudFormationSnippetsPath, ow.string.nonEmpty);

    const tasks: ListrTask[] = [];

    tasks.push({
      title: 'Uploading API Gateway Cloudformation snippets',
      task: async (_, task): Promise<void> => {
        const bucket = answers.s3.bucket;
        const prefix = `cloudformation/snippets/${answers.environment}/`;
        answers.apigw.templateSnippetS3UriBase = `s3://${bucket}/${prefix}`
        const s3 = new S3Utils(answers.region);

        const monorepoRoot = await getMonorepoRoot();
        const snippetPath = await getAbsolutePath(monorepoRoot, answers.apigw.cloudFormationSnippetsPath);
        const snippets = fs.readdirSync(snippetPath);
        for (const f of snippets) {
          task.output = `Uploading ${f}`;
          const fileContent = fs.readFileSync(path.join(snippetPath, f));
          const name = path.parse(f).base;
          await s3.uploadStreamToS3(bucket, prefix + name, fileContent);
        }
        task.output = `Uploads complete`;
      }
    });

    return [answers, tasks];
  }

  public async delete(): Promise<ListrTask[]> {
    console.log(`nothing to delete for this module`)
    return [];
  }

}
