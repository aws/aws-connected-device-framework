import chalk from 'chalk';
import { Command } from 'commander';
import cloudToEnvAction from './cloud-to-env.action';

export function cloudToEnvCmd(): Command {
  const cmd = new Command('cloud-to-env')
    .description('Generate the application config based on an existing cloud deployment.')
    .argument('<environment>', 'CDF environment')
    .argument('<region>', 'AWS region')
    .argument('<config folder>', 'location of folder to create and store generated .env files')
    .action(cloudToEnvAction)
    .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
    .showSuggestionAfterError();

  return cmd;

}
