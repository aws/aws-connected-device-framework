import chalk from "chalk";
import { Listr, ListrTask } from "listr2";
import { Answers } from "../models/answers";
import { loadModules } from "../models/modules";
import { topologicallySortModules } from "../prompts/modules.prompt";
import { AnswersStorage } from "../utils/answersStorage";
import configWizard from "../utils/wizard";

async function packageAction(
    environment: string,
    region: string,
    options: unknown
): Promise<void> {

    const modules = loadModules(environment);

    const configFile = options["config"]

    let answers: Answers;
    if (configFile === undefined) {
        answers = await configWizard(environment, region, true);
    } else {
        const answersStorage = new AnswersStorage('', region, environment);
        answers = await answersStorage.loadFromFile(configFile);
    }
    /**
    * start the template packaging
    **/
    const startedAt = new Date().getTime();

    console.log(chalk.green("\nStarting the packaging...\n"));

    const grouped = topologicallySortModules(
        modules,
        answers.modules.expandedIncludingOptional,
        false
    );

    for (const layer of grouped) {
        const layerTasks: ListrTask[] = [];
        for (const name of layer) {
            const m = modules.find((m) => m.name === name);
            if (m === undefined) {
                throw new Error(`Module ${name} not found!`);
            }
            if (m.package) {
                if (answers.modules.expandedMandatory.includes(m.name) || answers.modules.list.includes(m.name)) {
                    const [_, subTasks] = await m.package(answers);
                    if (subTasks?.length > 0) {
                        layerTasks.push({
                            title: m.friendlyName,
                            task: (_, parentTask): Listr =>
                                parentTask.newListr(subTasks, { concurrent: false }),
                        });
                    }
                }
            } else {
                throw new Error(`Module ${name} has no package functionality defined!`);
            }
        }

        const listr = new Listr(layerTasks, { concurrent: true });
        await listr.run();
    }
    const finishedAt = new Date().getTime();
    const took = (finishedAt - startedAt) / 1000;
    console.log(chalk.bgGreen(`\nDeployment complete! (${took}s)\n`));
}

export default packageAction;