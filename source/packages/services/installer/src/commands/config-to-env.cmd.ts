import chalk from 'chalk';
import { Command } from 'commander';
import configToEnvAction from './config-to-env.action';

export function configToEnvCmd(): Command {
  const cmd = new Command('config-to-env')
    .description('Generate the application config based on an existing deployment\'s configuration file.')
    .argument('<environment>', 'CDF environment')
    .argument('<region>', 'AWS region')
    .argument('<deployment config>', 'location of existing deployment configuration file')
    .argument('<config folder>', 'location of folder to create and store generated .env files')
    .action(configToEnvAction)
    .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
    .showSuggestionAfterError();

  return cmd;

}
