import { Question } from 'inquirer';
import { Answers, RestServiceModuleAttribues } from '../models/answers';
import { ModuleName } from '../models/modules';

export function customDomainPrompt(moduleName: ModuleName, answers: Answers): Question & { askAnswered: boolean }[] {
  return [
    {
      message: 'Deployed with a custom domain?',
      type: 'confirm',
      name: `${moduleName}.enableCustomDomain`,
      default: (answers[moduleName] as RestServiceModuleAttribues)?.enableCustomDomain ?? false,
      askAnswered: true,
    },
    {
      message: 'Enter the custom domain base path:',
      type: 'input',
      name: `${moduleName}.customDomainBasePath`,
      default: (answers[moduleName] as RestServiceModuleAttribues)?.customDomainBasePath,
      askAnswered: true,
      when(answers: Answers) {
        return (answers[moduleName] as RestServiceModuleAttribues)?.enableCustomDomain ?? false;
      },
      validate(answer: string) {
        if (answer?.length === 0) {
          return `You must enter the base path.`;
        }
        return true;
      },
    }];
}
