import chalk from 'chalk';
import { Command, Option } from 'commander';
import deployAction from './deploy.action';

export function deployCmd(): Command {
  const cmd = new Command('deploy')
    .description('Create the config for a new environment')
    .argument('<environment>', 'CDF environment')
    .argument('<region>', 'AWS region')
    .action(deployAction)
    .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
    .showSuggestionAfterError();

  cmd.addOption(new Option('-c, --config <configLocation>', 'bypass wizard and install using an existing config').conflicts('dryrun'))
  cmd.addOption(new Option('-d, --dryrun', 'run wizard to generate config file').conflicts('config'))

  return cmd;
}
