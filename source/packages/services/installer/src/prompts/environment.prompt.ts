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
import fs from 'fs';
import { Question } from 'inquirer';
import path from 'path';

export function overwriteEnvironmentPrompt(): Question {
    return {
        message: (answers: unknown) =>
            `Configuration for environment '${answers['environment']}' already exists. Assume this one?`,
        type: 'confirm',
        name: 'confirmOverwrite',
        when: (answers: unknown) => {
            const loc = path.join(answers['configurationPath'], answers['environment']);
            if (fs.existsSync(loc)) {
                return true;
            }
            return false;
        },
    };
}
