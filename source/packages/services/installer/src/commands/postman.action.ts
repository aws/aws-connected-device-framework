import { loadModules } from '../models/modules';
import { getCurrentAwsAccountId } from '../prompts/account.prompt';
import { buildServicesList } from '../prompts/modules.prompt';
import { AnswersStorage } from '../utils/answersStorage';

async function postmanAction(name: string, environment: string, region: string): Promise<void> {
    const accountId = await getCurrentAwsAccountId(region);

    const answerStorage = new AnswersStorage(accountId, region, environment);

    let answers = await answerStorage.loadFromDefaultPath();

    answers = Object.assign(answers, {});
    const modules = loadModules(environment);

    const allDeployedServices = [
        ...(answers.modules?.list ?? []),
        ...(answers.modules?.expandedMandatory ?? []),
    ];

    const servicesList = buildServicesList(modules, allDeployedServices).filter((o) => o.checked);

    const postmanConfig = {
        name: name,
        values: [
            {
                key: 'region',
                value: answers.region,
                enabled: true,
            },
            {
                key: 'applicationId',
                value: accountId,
                enabled: true,
            },
            {
                key: 'media_type_version',
                value: 'application/vnd.aws-cdf-v1.0+json',
                enabled: true,
            },
        ],
    };
    const deployedModules = modules.filter(
        (o) => servicesList.find((s) => s.value === o.name) !== undefined,
    );

    for (const module of deployedModules) {
        if (module['generatePostmanEnvironment']) {
            const restUrl = await module['generatePostmanEnvironment'](answers);
            if (restUrl) postmanConfig.values.push(restUrl);
        }
    }

    console.log(JSON.stringify(postmanConfig, null, 4));
}

export default postmanAction;
