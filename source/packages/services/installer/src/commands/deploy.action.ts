import chalk from "chalk";
import { Listr, ListrTask } from "listr2";
import { Answers } from "../models/answers";
import { loadModules, Module } from "../models/modules";
import { getCurrentAwsAccountId } from "../prompts/account.prompt";
import {
  topologicallySortModules,
} from "../prompts/modules.prompt";
import { AnswersStorage } from "../utils/answersStorage";
import configWizard from "../utils/wizard";

let modules: Module[];

async function deployAction(
  environment: string,
  region: string,
  options: unknown
): Promise<void> {
  modules = loadModules(environment);

  const accountId = await getCurrentAwsAccountId(region);

  const answersStorage = new AnswersStorage(accountId, region, environment);

  let answers: Answers;

  const configFile = options["config"]

  if (configFile !== undefined) {
    answers = await AnswersStorage.loadFromFile(configFile,
      {
        environment, region, accountId
      });
  } else {
    const dryRun = options["dryrun"] !== undefined
    answers = await configWizard(environment, region, dryRun);
    if (dryRun) {
      // Dry run only produced the config without running the deployment
      answers = await cleanUpConfig(answers)
      answersStorage.save(answers);
      return;
    }
  }

  answers.s3.optionalDeploymentBucket = options["bucket"]
  answers.s3.optionalDeploymentPrefix = options["prefix"]
  /**
   * start the deployment...
   */
  const startedAt = new Date().getTime();
  console.log(chalk.green("\nStarting the deployment...\n"));

  const grouped = topologicallySortModules(
    modules,
    answers.modules.expandedIncludingOptional,
    false
  );

  for (const layer of grouped) {
    // e.g. ['apigw', 'openssl'] of [['apigw', 'openssl'],['provisioning']]
    const layerTasks: ListrTask[] = [];
    for (const name of layer) {
      // e.g. 'apigw' of ['apigw', 'openssl']
      const m = modules.find((m) => m.name === name);
      if (m === undefined) {
        throw new Error(`Module ${name} not found!`);
      }
      if (m.install) {
        if (answers.modules.expandedMandatory.includes(m.name) || answers.modules.list.includes(m.name)) {
          const [_, subTasks] = await m.install(answers);
          if (subTasks?.length > 0) {
            layerTasks.push({
              title: m.friendlyName,
              task: (_, parentTask): Listr =>
                parentTask.newListr(subTasks, { concurrent: false }),
            });
          }
        }
      } else {
        throw new Error(`Module ${name} has no install functionality defined!`);
      }

    }

    const listr = new Listr(layerTasks, { concurrent: true });
    await listr.run();
  }

  // Remove unnecessary answers
  answers = await cleanUpConfig(answers)
  answersStorage.save(answers);

  const finishedAt = new Date().getTime();
  const took = (finishedAt - startedAt) / 1000;

  console.log(chalk.bgGreen(`\nDeployment complete! (${took}s)\n`));
}


async function cleanUpConfig(answers: Answers): Promise<Answers> {
  // Remove unnecessary answers
  delete answers?.bulkCerts?.suppliers?.list;
  delete answers?.bulkCerts?.setSupplier;
  delete answers?.bulkCerts?.caAlias;
  delete answers?.bulkCerts?.caValue;
  delete answers?.eventBus?.arn;
  delete answers?.provisioning?.iotCaAliases?.list;
  delete answers?.provisioning?.pcaAliases?.list;
  delete answers.provisioning?.pcaFinished 
  delete answers.provisioning?.iotCaFinished; 
  delete answers?.provisioning?.setPcaAliases;
  delete answers?.provisioning?.setIotCaAliases;
  delete answers?.provisioning?.pcaAlias;
  delete answers?.provisioning?.pcaArn;
  delete answers?.s3?.optionalDeploymentBucket;
  delete answers.s3.optionalDeploymentPrefix;
  return answers;
}

export default deployAction;
