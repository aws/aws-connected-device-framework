/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import { Question } from 'inquirer';
import { Answers, ServiceModuleAttributes } from '../models/answers';
import { ModuleName } from '../models/modules';

export interface ApplicationConfigurationMapping {
    question: string;
    defaultConfiguration: string | boolean | number;
    propertyName: string;
}

export type ApplicationConfigurationMappingList = ApplicationConfigurationMapping[];

export function applicationConfigurationPrompt(
    name: ModuleName,
    answers: Answers,
    configurations: ApplicationConfigurationMappingList
): Question[] {
    const questions: unknown[] = [
        {
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
        },
    ];

    questions.push(
        ...configurations.map((configuration) => {
            const { question, propertyName, defaultConfiguration } = configuration;
            return {
                message: question,
                type: typeof defaultConfiguration === 'boolean' ? 'confirm' : 'input',
                name: `${name}.${propertyName}`,
                default: answers[name]?.[propertyName] ?? defaultConfiguration,
                when(answers: Answers) {
                    return !answers[name]?.['defaultAnswer'];
                },
                askAnswered: true,
            };
        })
    );

    return questions;
}
