import chalk from 'chalk';
import { Command } from 'commander';
import generateLocalConfigAction from './generate-local-config.action';

export function generateLocalConfigCmd(): Command {
    const cmd = new Command('generate-local-config')
        .description(
            'Generate the required config to run applications locally based on an existing cloud deployment.',
        )
        .argument('<environment>', 'CDF environment')
        .argument('<region>', 'AWS region')
        .argument(
            '<config folder>',
            'Location of folder to create and store generated .env files.',
        )
        .action(generateLocalConfigAction)
        .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
        .showSuggestionAfterError();

    return cmd;
}
