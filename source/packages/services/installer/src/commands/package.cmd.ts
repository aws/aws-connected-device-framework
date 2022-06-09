import chalk from 'chalk';
import { Command } from 'commander';
import packageAction from './package.action';

export function packageCmd(): Command {
  const cmd = new Command('package')
    .description('Package the CloudFormation templates and its referenced artifacts')
    .argument('<pathToConfigFile>', 'Path to config file. Can be generated with cdf-cli deploy --dryrun')
    .option('-b, --bucket <optionalBucket>', 'optional s3 bucket to be used when storing the deployment artifact')
    .option('-p, --prefix <optionalPrefix>', 'optional s3 prefix to be used when storing the deployment artifact')
    .action(packageAction)
    .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
    .showSuggestionAfterError();
  return cmd;
}
