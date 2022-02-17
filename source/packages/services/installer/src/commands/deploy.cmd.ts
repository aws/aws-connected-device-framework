import chalk from 'chalk';
import { Command } from 'commander';
import deployAction from './deploy.action';

export function deployCmd(): Command {
  const cmd = new Command('deploy')
    .description('Create the config for a new environment')
    .argument('<environment>', 'CDF environment')
    .argument('<region>', 'AWS region')
    .option('-c, --config <configLocation>', 'bypass wizard and install using an existing config')
    .option('-d, --dryrun', 'run wizard to generate config file')
    .action(deployAction)
    .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
    .showSuggestionAfterError();

  return cmd;
}
