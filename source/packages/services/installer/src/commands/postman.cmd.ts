import chalk from 'chalk';
import { Command } from 'commander';
import postmanAction from './postman.action';

export function postmanCmd () : Command {
  const cmd = new Command('postman')
    .description('Create the Postman environment configuration')
    .argument('<name>', 'Environment name')
    .argument('<environment>', 'CDF environment')
    .argument('<region>', 'AWS region')
    .action(postmanAction)
    .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
    .showSuggestionAfterError();

  return cmd;
}
