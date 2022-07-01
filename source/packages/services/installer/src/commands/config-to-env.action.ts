import path from "path";
import { buildServicesList } from "../prompts/modules.prompt";
import { loadModules, RestModule } from "../models/modules";
import {
  getCurrentAwsAccountId,
  getCurrentIotCredentialEndpoint,
  getCurrentIotEndpoint,
} from "../prompts/account.prompt";
import fs from "fs";
import { AnswersStorage } from "../utils/answersStorage";

async function configToEnvAction(
  environment: string,
  region: string,
  deploymentConfig: string,
  configFolderLocation: string
): Promise<void> {
  const accountId = await getCurrentAwsAccountId(region);
  const iotEndpoint = await getCurrentIotEndpoint(region);
  const iotCredentialEndpoint = await getCurrentIotCredentialEndpoint(region);

  let answers = await AnswersStorage.loadFromFile(deploymentConfig);

  answers = Object.assign(answers, {
    accountId,
    iotEndpoint,
    iotCredentialEndpoint,
  });

  const modules = loadModules(environment);

  const servicesList = buildServicesList(modules, answers.modules?.list).filter(
    (o) => o.checked
  );

  const deployedModules = modules
    .filter(
      (o) =>
        servicesList.find((s) => s.value === o.name) !== undefined &&
        o["generateLocalConfiguration"] !== undefined
    )
    .map((o) => {
      return o as RestModule;
    });

  for (const module of deployedModules) {
    const serviceFolderPath = path.join(configFolderLocation, module.name);
    const serviceFileNamePath = path.join(
      configFolderLocation,
      module.name,
      ".env"
    );

    if (!fs.existsSync(serviceFolderPath))
      fs.mkdirSync(serviceFolderPath, { recursive: true });

    let serviceConfig = await module.generateLocalConfiguration(answers);
    serviceConfig = `${serviceConfig}\r\n${module.generateApplicationConfiguration(
      answers
    )}`;
    serviceConfig = `# Run below command before starting Express.js for ${module.friendlyName}\r\n# export CONFIG_LOCATION=${serviceFileNamePath}\r\nAWS_REGION=${region}\r\nAWS_ACCOUNTID=${accountId}\r\n${serviceConfig}`;
    fs.writeFileSync(serviceFileNamePath, serviceConfig);
  }
}

export default configToEnvAction;
