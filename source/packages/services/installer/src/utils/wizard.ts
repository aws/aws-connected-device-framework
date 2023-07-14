import chalk from 'chalk';
import inquirer from 'inquirer';
import clone from 'just-clone';
import { Answers } from '../models/answers';
import { ModuleName, loadModules } from '../models/modules';
import { getCurrentAwsAccountId } from '../prompts/account.prompt';
import {
    buildServicesList,
    chooseServicesPrompt,
    confirmServicesPrompt,
    expandModuleList,
    topologicallySortModules,
} from '../prompts/modules.prompt';
import { chooseS3BucketPrompt } from '../prompts/s3.prompt';
import { AnswersStorage } from './answersStorage';
import { TagsList, isValidTagKey, isValidTagValue } from './tags';

async function configWizard(
    environment: string,
    region: string,
    dryRun = false
): Promise<Answers> {
    const modules = loadModules(environment);

    const accountId = await getCurrentAwsAccountId(region);
    const accountConfirmation = await inquirer.prompt([
        {
            message: `Detected account ${chalk.blue(
                accountId
            )} based on credentials in use. Is this correct?`,
            type: 'confirm',
            name: 'confirm',
            default: true,
        },
    ]);

    if (accountConfirmation.confirm === false) {
        console.log(
            chalk.red(
                '\nAborting deployment. Please ensure you are running the installer with the correct credentials.\n'
            )
        );
        throw new Error('Aborted');
    }

    const answersStorage = new AnswersStorage(accountId, region, environment);

    let answers: Answers = answersStorage.loadFromDefaultPath();
    answersStorage.save(answers);

    // reset answers that are specific to each deployment run, such as confirmations for deployments to continue
    delete answers.modules?.confirm;
    delete answers.modules?.expandedMandatory;
    delete answers.modules?.expandedIncludingOptional;

    const previouslyChosenModulesSet = new Set([
        ...(answers.modules?.list ?? []),
        ...(answers.modules?.expandedMandatory ?? []),
        ...(answers.modules?.expandedIncludingOptional ?? []),
    ]);

    // obtain list of service modules to choose from to deploy
    const servicesList = buildServicesList(modules, answers.modules?.list);
    answers = await inquirer.prompt(
        [chooseServicesPrompt(servicesList), confirmServicesPrompt(modules)],
        answers
    );

    answersStorage.save(answers);

    if ((answers.modules?.confirm ?? false) === false) {
        console.log(chalk.bgRed('Aborted!'));
        throw new Error('Aborted');
    }

    // based on selected service modules, obtain full list of service and infrastructure modules to configure and install based on configured dependencies
    answers.modules.expandedMandatory = expandModuleList(modules, answers.modules.list, false);

    answers.modules.expandedIncludingOptional = expandModuleList(
        modules,
        answers.modules.list,
        true
    );

    const newlyChosenModulesSet = new Set([
        ...(answers.modules?.list ?? []),
        ...(answers.modules?.expandedMandatory ?? []),
        ...(answers.modules?.expandedIncludingOptional ?? []),
    ]);

    for (const module of previouslyChosenModulesSet) {
        if (!newlyChosenModulesSet.has(module as ModuleName)) {
            // answer for modules that are unchecked will be deleted
            delete answers[`${module}`];
        }
    }

    const expandedFriendlyNames = modules
        .filter((m) => answers.modules.expandedIncludingOptional.includes(m.name))
        .map((m) => m.friendlyName);
    console.log(
        chalk.green(
            `\nIncluding dependencies, the full list of modules to be evaluated is:\n${expandedFriendlyNames
                .map((m) => `   - ${m}`)
                .join('\n')}\n`
        )
    );

    // TODO: verify that bundles exist for all the selected modules
    answers = await inquirer.prompt(
        [
            chooseS3BucketPrompt(
                'Provide the name of an existing S3 bucket to store artifacts for this CDF environment:',
                's3.bucket',
                answers.s3?.bucket
            ),
            {
                message: `Enter custom tags to be applied to all resources created for this CDF environment. You can enter up to 48 tags in the format key1;val1;key2;val2;...`,
                type: 'input',
                name: 'customTags',
                default: answers.customTags ?? '',
                askAnswered: true,
                validate(answer: string) {
                    let tagsList: TagsList;
                    try {
                        tagsList = new TagsList(answer);
                    } catch {
                        return `Please enter tags in the format key1;val1;key2;val2;... There must be an even number of keys/values.`;
                    }
                    if (tagsList.length > 48 * 2) {
                        return `You entered ${tagsList.length} tags but the maximum is 48. The CloudFormation service limit is 50, CDF always includes cdf_environment and cdf_service.`;
                    }
                    for (let idx = 0; idx < tagsList.length; idx++) {
                        const tag = tagsList.tags[idx];
                        if (tag.key === 'cdf_environment' || tag.key == 'cdf_service') {
                            return 'The tags cdf_environment and cdf_service are always included and cannot be specified as custom tags.';
                        }
                        if (!isValidTagKey(tag.key)) {
                            return `"${tag.key}" is not a valid tag key. Tag keys can contain up to 128 characters, numbers, and any of +\\-=._:@. Keys must not start with "aws:" or equal ".", "..", "_index", or the empty string. See also https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html#tag-restrictions`;
                        }
                        if (!isValidTagValue(tag.value)) {
                            return `"${tag.value}" is not a valid tag value. Tag keys can contain up to 256 characters, numbers, spaces, and any of +\\-=._:/@. Values should not start or end with a space. See also: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html#tag-restrictions`;
                        }
                    }

                    return true;
                },
            },
        ],
        answers
    );

    answers.dryRun = dryRun;
    answersStorage.save(answers);

    let optionalModuleAdded = true;

    const answeredModule: { [key: string]: boolean } = {};

    while (optionalModuleAdded) {
        const originalExpandedMandatory = clone(answers.modules.expandedMandatory);

        const mandatoryGrouped = topologicallySortModules(
            modules,
            answers.modules.expandedMandatory
        );

        for (const layer of mandatoryGrouped) {
            for (const name of layer) {
                const m = modules.find((m) => m.name === name);
                if (m.prompts && !answeredModule[name]) {
                    console.log(chalk.yellow(`\n${m.friendlyName}...`));
                    answers = await m.prompts(answers);
                    answersStorage.save(answers);
                    answeredModule[name] = true;
                }
            }
        }
        optionalModuleAdded =
            originalExpandedMandatory.length !== answers.modules.expandedMandatory.length;
    }

    delete answers.dryRun;
    answersStorage.save(answers);

    console.log(
        chalk.green(
            `Configuration has been saved to '${answersStorage.getConfigurationFilePath()}'.\nIt is highly recommended that you store this configuration under source control to automate future deployments.`
        )
    );

    return answers;
}

export default configWizard;
