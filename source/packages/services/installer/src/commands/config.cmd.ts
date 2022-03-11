import chalk from 'chalk';
import { Command } from 'commander';
import configAction from './config.action';

export function configCmd(): Command {
  const cmd = new Command('config-to-env')
    .description('Generate the application config based on an existing deployment.')
    .argument('<environment>', 'CDF environment')
    .argument('<region>', 'AWS region')
    .argument('<deployment config>', 'deployment configuration file')
    .argument('<config folder>', 'create configuration file and store it in folder')
    .action(configAction)
    .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
    .showSuggestionAfterError();

  return cmd;

}
