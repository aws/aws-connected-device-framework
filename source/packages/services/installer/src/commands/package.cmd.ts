import chalk from 'chalk';
import { Command } from 'commander';
import packageAction from './package.action';

export function packageCmd(): Command {
    const cmd = new Command('package')
        .description('Package the CloudFormation templates and its referenced artifacts')
        .argument('<pathToConfigFile>', 'Path to config file. Can be generated with cdf-cli deploy --dryrun')
        .action(packageAction)
        .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
        .showSuggestionAfterError();
    return cmd;
}
