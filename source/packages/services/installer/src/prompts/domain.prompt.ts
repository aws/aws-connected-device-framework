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
import { Answers, RestServiceModuleAttribues } from '../models/answers';
import { ModuleName } from '../models/modules';

export function customDomainPrompt(moduleName: ModuleName, answers: Answers): Question[] {
    return [
        {
            message: 'Deployed with a custom domain?',
            type: 'confirm',
            name: `${moduleName}.enableCustomDomain`,
            default:
                (answers[moduleName] as RestServiceModuleAttribues)?.enableCustomDomain ?? false,
            askAnswered: true,
        },
        {
            message: 'Enter the custom domain base path:',
            type: 'input',
            name: `${moduleName}.customDomainBasePath`,
            default: (answers[moduleName] as RestServiceModuleAttribues)?.customDomainBasePath,
            askAnswered: true,
            when(answers: Answers) {
                return (
                    (answers[moduleName] as RestServiceModuleAttribues)?.enableCustomDomain ??
                    false
                );
            },
            validate(answer: string) {
                if (answer?.length === 0) {
                    return `You must enter the base path.`;
                }
                return true;
            },
        },
    ];
}
