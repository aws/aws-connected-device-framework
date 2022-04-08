import chalk from "chalk";
import inquirer from "inquirer";
import { Listr, ListrTask } from "listr2";
import { Answers } from "../models/answers";
import { loadModules, Module, ModuleName } from "../models/modules";
import { getCurrentAwsAccountId } from "../prompts/account.prompt";
import {
  buildServicesList,
  chooseServicesPrompt,
  confirmServicesPrompt,
  expandModuleList,
  topologicallySortModules,
} from "../prompts/modules.prompt";
import { chooseS3BucketPrompt } from "../prompts/s3.prompt";
import { AnswersStorage } from "../utils/answersStorage";

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

  if (configFile === undefined) {
    answers = await configWizard(environment, region);
  } else {
    answers = await answersStorage.loadFromFile(configFile);
  }

  if (options["dryrun"] !== undefined) {
    // Dry run only produced the config without running the deployment
    return;
  }

  /**
   * start the deployment...
   */
  const startedAt = new Date().getTime();
  console.log(chalk.green("\nStarting the deployment...\n"));

  const grouped = topologicallySortModules(
    modules,
    answers.modules.expandedIncludingOptional
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
        const [_, subTasks] = await m.install(answers);
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

  // Remove unnecessary answers
  delete answers.bulkCerts?.suppliers;
  delete answers.bulkCerts?.setSupplier;
  delete answers.bulkCerts?.caAlias;
  delete answers.bulkCerts?.caId;
  answersStorage.save(answers);


  const finishedAt = new Date().getTime();
  const took = (finishedAt - startedAt) / 1000;

  console.log(chalk.bgGreen(`\nDeployment complete! (${took}s)\n`));
}

async function configWizard(
  environment: string,
  region: string
): Promise<Answers> {
  const accountId = await getCurrentAwsAccountId(region);
  const accountConfirmation = await inquirer.prompt([
    {
      message: `Detected account ${chalk.blue(
        accountId
      )} based on credentials in use. Is this correct?`,
      type: "confirm",
      name: "confirm",
      default: true,
    },
  ]);
  if (accountConfirmation.confirm === false) {
    console.log(
      chalk.red(
        "\nAborting deployment. Please ensure you are running the installer with the correct credentials.\n"
      )
    );
    throw new Error("Aborted");
  }

  const answersStorage = new AnswersStorage(accountId, region, environment);

  let answers: Answers = answersStorage.loadFromDefaultPath();
  answersStorage.save(answers);

  // reset answers that are specific to each deployment run, such as confirmations for deployments to continue
  delete answers.modules?.confirm;
  delete answers.modules?.expandedMandatory;
  delete answers.modules?.expandedIncludingOptional;

  const previouslyChosenModulesSet = new Set([...answers.modules?.list ?? [], ...answers.modules?.expandedMandatory ?? [], ...answers.modules?.expandedIncludingOptional ?? []])

  // obtain list of service modules to choose from to deploy
  const servicesList = buildServicesList(modules, answers.modules?.list);
  answers = await inquirer.prompt(
    [chooseServicesPrompt(servicesList), confirmServicesPrompt(modules)],
    answers
  );

  answersStorage.save(answers);

  if ((answers.modules?.confirm ?? false) === false) {
    console.log(chalk.bgRed("Aborted!"));
    throw new Error("Aborted");
  }

  // based on selected service modules, obtain full list of service and infrastructure modules to configure and install based on configured dependencies
  answers.modules.expandedMandatory = expandModuleList(
    modules,
    answers.modules.list,
    false
  );
  answers.modules.expandedIncludingOptional = expandModuleList(
    modules,
    answers.modules.list,
    true
  );

  const newlyChosenModulesSet = new Set([...answers.modules?.list ?? [], ...answers.modules?.expandedMandatory ?? [], ...answers.modules?.expandedIncludingOptional ?? []])

  for (const module of previouslyChosenModulesSet) {
    if (!newlyChosenModulesSet.has(module as ModuleName)) {
      // answer for modules that are unchecked will be deleted
      delete answers[`${module}`]
    }
  }

  const expandedFriendlyNames = modules
    .filter((m) => answers.modules.expandedIncludingOptional.includes(m.name))
    .map((m) => m.friendlyName);
  console.log(
    chalk.green(
      `\nIncluding dependencies, the full list of modules to be evaluated is:\n${expandedFriendlyNames
        .map((m) => `   - ${m}`)
        .join("\n")}\n`
    )
  );

  // TODO: verify that bundles exist for all the selected modules

  answers = await inquirer.prompt(
    [
      chooseS3BucketPrompt(
        "Provide the name of an existing S3 bucket to store artifacts for this CDF environment:",
        "s3.bucket",
        answers.s3?.bucket
      ),
    ],
    answers
  );

  answersStorage.save(answers);

  // prompt for module specific configuration
  const grouped = topologicallySortModules(
    modules,
    answers.modules.expandedIncludingOptional
  );
  for (const layer of grouped) {
    for (const name of layer) {
      const m = modules.find((m) => m.name === name);
      if (m.prompts) {
        console.log(chalk.yellow(`\n${m.friendlyName}...`));
        answers = await m.prompts(answers);
        answersStorage.save(answers);
      }
    }
  }

  console.log(
    chalk.green(
      `Configuration has been saved to '${answersStorage.getConfigurationFilePath()}'.\nIt is highly recommended that you store this configuration under source control to automate future deployments.`
    )
  );
  return answers;
}

export default deployAction;
