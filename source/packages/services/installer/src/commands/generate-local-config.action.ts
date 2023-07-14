import fs from 'fs';
import path from 'path';

import {
    CloudFormationClient,
    DescribeStacksCommand,
    DescribeStacksOutput,
} from '@aws-sdk/client-cloudformation';
import {
    GetFunctionCommand,
    GetFunctionCommandOutput,
    LambdaClient,
} from '@aws-sdk/client-lambda';

import { loadModules, RestModule } from '../models/modules';
import { getCurrentAwsAccountId } from '../prompts/account.prompt';
import { getMonorepoRoot } from '../prompts/paths.prompt';

async function generateLocalConfigAction(
    environment: string,
    region: string,
    configFolderLocation: string,
): Promise<void> {
    const lambdaClient = new LambdaClient({
        region,
    });

    const cloudFormationClient = new CloudFormationClient({
        region,
    });

    const accountId = await getCurrentAwsAccountId(region);

    const modules = loadModules(environment).filter((m) => m.type === 'SERVICE');

    const monorepoRoot = await getMonorepoRoot();

    for (const module of modules) {
        // attempt to find the deployed stack for the module
        const stackName = (module as RestModule).stackName;
        if (stackName === undefined) {
            continue;
        }
        let stack: DescribeStacksOutput;
        try {
            stack = await cloudFormationClient.send(
                new DescribeStacksCommand({
                    StackName: stackName,
                }),
            );
        } catch (e) {
            continue;
        }

        // see if we have a rest api function name
        const functionName = stack.Stacks?.[0]?.Outputs?.filter(
            (o) => o.OutputKey === 'RestApiFunctionName',
        )?.[0]?.OutputValue;
        if (functionName === undefined) {
            continue;
        }

        // retrieve the lambda
        let lambda: GetFunctionCommandOutput;
        try {
            lambda = await lambdaClient.send(
                new GetFunctionCommand({
                    FunctionName: functionName,
                }),
            );
        } catch (e) {
            continue;
        }

        const environmentVariables = lambda.Configuration?.Environment?.Variables;
        if (environmentVariables === undefined) {
            continue;
        }

        // create the .env file and write the config to it
        const moduleFolder = path.join(configFolderLocation, module.name);
        if (!fs.existsSync(moduleFolder)) {
            fs.mkdirSync(moduleFolder, { recursive: true });
        }

        const moduleFile = path.join(moduleFolder, `${environment}.env`);

        const moduleProjectDir = path.join(
            monorepoRoot,
            'source',
            'packages',
            'services',
            (module as RestModule).localProjectDir,
        );

        // convert the lambdas environment config as the .env application config file
        const overrides = environmentVariables['APP_CONFIG'];
        if (overrides) {
            overrides
                .split('\n')
                ?.map((o) => o.trim().split('='))
                ?.forEach((o) => (environmentVariables[o[0]] = o[1]));
            delete environmentVariables['APP_CONFIG'];
        }

        let appConfig = Object.entries(environmentVariables)
            ?.sort()
            ?.map(([k, v]) => `${k}=${v}`)
            ?.join('\r\n');

        appConfig = `
##########################################################################################
####               '${module.friendlyName}' application configuration           
##########################################################################################

# To run the module locally
#     cd ${moduleProjectDir}
#     CONFIG_LOCATION=${moduleFile} npm run start

AWS_REGION=${region}
AWS_ACCOUNTID=${accountId}

${appConfig}
`;

        fs.writeFileSync(moduleFile, appConfig);
    }

    console.log(`\nFinished exporting application configuration to '${configFolderLocation}'.\n`);
    console.log(
        `If you are unsure on how to run a module locally, open the generated .env file for that module from the above mentioned folder. We have added instructions on how to start the module to the file to get you going.\n\n`,
    );
}

export default generateLocalConfigAction;
