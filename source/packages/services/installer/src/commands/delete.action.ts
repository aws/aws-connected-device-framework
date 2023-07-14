import chalk from 'chalk';
import inquirer from 'inquirer';
import { Listr, ListrTask } from 'listr2';
import { loadModules, Module } from '../models/modules';
import { getCurrentAwsAccountId } from '../prompts/account.prompt';
import { topologicallySortModules } from '../prompts/modules.prompt';
import { AnswersStorage } from '../utils/answersStorage';

let modules: Module[];

async function deleteAction(environment: string, region: string): Promise<void> {
    modules = loadModules(environment);

    const accountId = await getCurrentAwsAccountId(region);
    const answerStorage = new AnswersStorage(accountId, region, environment);
    const answers = await answerStorage.loadFromDefaultPath();

    const deletionConfirmation = await inquirer.prompt([
        {
            message: `Are you sure you want delete all the cdf stacks?`,
            type: 'confirm',
            name: 'confirm',
            default: true,
        },
    ]);

    if (deletionConfirmation.confirm === false) {
        console.log(chalk.red('\nAborting deletion of stacks(s).\n'));
        throw new Error('Aborted');
    }

    const startedAt = new Date().getTime();
    console.log(chalk.green('\nStarting the removal of stacks...\n'));

    const grouped = topologicallySortModules(
        modules,
        answers.modules.expandedIncludingOptional,
        false,
    ).reverse();

    for (const layer of grouped) {
        const layerTasks: ListrTask[] = [];
        for (const name of layer) {
            const m = modules.find((m) => m.name === name);
            if (m === undefined) {
                throw new Error(`Module ${name} not found!`);
            }
            if (m.delete) {
                const subTasks = await m.delete(answers);
                if (subTasks?.length > 0) {
                    layerTasks.push({
                        title: m.friendlyName,
                        task: (_, parentTask): Listr =>
                            parentTask.newListr(subTasks, { concurrent: false }),
                    });
                }
            } else {
                throw new Error(`Module ${name} has no install functionality defined!`);
            }
        }

        const listr = new Listr(layerTasks, { concurrent: true });
        await listr.run();
    }

    const finishedAt = new Date().getTime();
    const took = (finishedAt - startedAt) / 1000;
    console.log(chalk.bgGreen(`\nRemoval complete! (${took}s)\n`));
}

export default deleteAction;
