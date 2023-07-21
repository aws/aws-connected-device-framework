import chalk from 'chalk';
import { Command } from 'commander';
import deleteAction from './delete.action';

export function deleteCmd(): Command {
    const cmd = new Command('delete')
        .description('Delete an existing CDF environment from your AWS Account.')
        .argument('<environment>', 'CDF environment.')
        .argument('<region>', 'AWS region.')
        .action(deleteAction)
        .showHelpAfterError(chalk.yellowBright('\n(add --help for additional information)'))
        .showSuggestionAfterError();
    return cmd;
}
