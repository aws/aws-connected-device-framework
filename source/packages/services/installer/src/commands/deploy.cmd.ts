import chalk from 'chalk';
import { Command, Option } from 'commander';
import deployAction from './deploy.action';

export function deployCmd(): Command {
  const cmd = new Command('deploy')
    .description('Generate deployment configuration and optionally deploy it to an AWS account')
    .argument('<environment>', 'CDF environment')
    .argument('<region>', 'AWS region')
    .action(deployAction)
    .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
    .showSuggestionAfterError();

  cmd.addOption(new Option('-b, --bucket <optionalBucket>', 'optional s3 bucket to be used when storing the deployment artifact').conflicts('dryrun'))
  cmd.addOption(new Option('-p, --prefix <optionalPrefix>', 'optional s3 prefix to be used when storing the deployment artifact').conflicts('dryrun'))
  cmd.addOption(new Option('-c, --config <configLocation>', 'bypass wizard and install using an existing config').conflicts('dryrun'))
  cmd.addOption(new Option('-d, --dryrun', 'run wizard to generate config file').conflicts('config'))

  return cmd;
}
