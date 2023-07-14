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
import {
    Answers,
    ProvisionedConcurrencyModuleAttribues as ProvisionedConcurrencyModuleAttributes,
} from '../models/answers';
import { ModuleName } from '../models/modules';

export function enableAutoScaling(moduleName: ModuleName, answers: Answers): Question {
    return {
        message: 'Deployed with a autoscaling?',
        type: 'confirm',
        name: `${moduleName}.enableAutoScaling`,
        default:
            (answers[moduleName] as ProvisionedConcurrencyModuleAttributes)?.enableAutoScaling ??
            false,
        askAnswered: true,
    };
}

export function provisionedConcurrentExecutions(
    moduleName: ModuleName,
    answers: Answers
): Question {
    return {
        message: 'The no. of desired concurrent executions to  provision.  Set to 0 to disable.',
        type: 'input',
        name: `${moduleName}.provisionedConcurrentExecutions`,
        default:
            (answers[moduleName] as ProvisionedConcurrencyModuleAttributes)
                ?.provisionedConcurrentExecutions ?? 0,
        askAnswered: true,
        validate(answer: number) {
            if (answer < 0) {
                return `You must enter number larger than 0.`;
            }
            return true;
        },
    };
}
