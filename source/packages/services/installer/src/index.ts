#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { cloudToEnvCmd } from './commands/cloud-to-env.cmd';
import { configToEnvCmd } from './commands/config-to-env.cmd';
import { deleteCmd } from './commands/delete.cmd';
import { deployCmd } from './commands/deploy.cmd';
import { packageCmd } from './commands/package.cmd';
import { postmanCmd } from './commands/postman.cmd';

const program = new Command();

program.name('cdf-cli')
  .usage('[options] command <arguments>')
  .addCommand(deployCmd())
  .addCommand(configToEnvCmd())
  .addCommand(cloudToEnvCmd())
  .addCommand(postmanCmd())
  .addCommand(packageCmd())
  .addCommand(deleteCmd())
  .showHelpAfterError('(add --help for additional information)')
  .showSuggestionAfterError();

// fallback to help
program.action(() => {
  console.log(chalk.yellowBright('\n  No command specified\n'));
  program.outputHelp();
  process.exit(1);
});

process.on('unhandledRejection', function (err) {
  console.log('installer fails with error: ', err)
  process.exit(1)
});

program.parse();
