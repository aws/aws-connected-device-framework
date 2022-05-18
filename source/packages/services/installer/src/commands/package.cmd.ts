import chalk from 'chalk';
import { Command } from 'commander';
import packageAction from './package.action';

export function packageCmd(): Command {
    const cmd = new Command('package')
        .description('Package the CloudFormation templates and its referenced artifacts')
        .argument('<environment>', 'CDF environment')
        .argument('<region>', 'AWS region')
        .option('-c, --config <configLocation>', 'bypass wizard and install using an existing config')
        .action(packageAction)
        .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
        .showSuggestionAfterError();
    return cmd;
}
