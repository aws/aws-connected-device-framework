import { ModuleName } from '../models/modules';
import { Answers, ServiceModuleAttributes } from '../models/answers';
import { Question } from 'inquirer';

export interface ApplicationConfigurationMapping {
  question: string,
  defaultConfiguration: string | boolean | number,
  propertyName: string,
}


export type ApplicationConfigurationMappingList = ApplicationConfigurationMapping[]

export function applicationConfigurationPrompt(name: ModuleName, answers: Answers,
  configurations: ApplicationConfigurationMappingList): Question[] {
  const questions: unknown[] = [{
    message: `Use default configuration for application?`,
    type: 'confirm',
    name: `${name}.defaultAnswer`,
    default: answers[name]?.['defaultAnswer'] ?? true,
    askAnswered: true,
  },
  {
    message: 'What log level to set?',
    type: 'list',
    choices: ['error', 'warn', 'info', 'debug', 'silly'],
    name: `${name}.loggingLevel`,
    default: (answers[name] as ServiceModuleAttributes)?.loggingLevel ?? 'info',
    when(answers: Answers) {
      return !answers[name]?.['defaultAnswer'];
    },
    askAnswered: true,
  }
  ];

  questions.push(...configurations.map(configuration => {
    const { question, propertyName, defaultConfiguration } = configuration;
    return {
      message: question,
      type: typeof (defaultConfiguration) === "boolean" ? 'confirm' : 'input',
      name: `${name}.${propertyName}`,
      default: answers[name]?.[propertyName] ?? defaultConfiguration,
      when(answers: Answers) {
        return !answers[name]?.['defaultAnswer'];
      },
      askAnswered: true,
    };
  }));

  return questions;

}
