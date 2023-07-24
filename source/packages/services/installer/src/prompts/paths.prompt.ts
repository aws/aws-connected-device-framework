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
import findUp from 'find-up';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';

const inquirerFuzzyPath = require('inquirer-fuzzy-path');

inquirer.registerPrompt('fuzzypath', inquirerFuzzyPath);

export function fuzzyPathPrompt(
    message: string,
    name: string,
    itemType: 'any' | 'directory' | 'file',
    rootPath?: string,
    initial?: string
): unknown {
    return {
        message,
        type: 'fuzzypath',
        name,
        default: initial,
        askAnswered: true,
        excludePath: (nodePath: string) =>
            nodePath.startsWith('node_modules') || nodePath.startsWith('dist'),
        excludeFilter: (nodePath: string) => nodePath == '.',
        itemType,
        rootPath: rootPath ?? path.parse(process.cwd()).root,
        depthLimit: 5,
        validate(answer: string) {
            if ((answer?.length ?? 0) === 0) {
                return `You must enter a path`;
            }
            if (!fs.existsSync(answer)) {
                return `You must enter a valid path.\n'${answer}' does not exist.`;
            }
            return true;
        },
    };
}

export async function getMonorepoRoot(): Promise<string> {
    const rootPath = await findUp('.cdf-monorepo-root');
    if (rootPath !== undefined) {
        return path.dirname(rootPath);
    } else {
        return undefined;
    }
}

export async function getAbsolutePath(
    monorepoRoot: string,
    relativePath: string
): Promise<string> {
    const absolutePath = path.join(monorepoRoot, relativePath);
    return absolutePath;
}

export function pathPrompt(message: string, name: string, initial?: string): unknown {
    return {
        message,
        type: 'input',
        name,
        default: initial,
        askAnswered: true,
        async validate(answer: string) {
            if ((answer?.length ?? 0) === 0) {
                return `You must enter a path.`;
            }
            const monorepoRoot = await getMonorepoRoot();
            if (monorepoRoot === undefined) {
                return `Unable to discover the CDF monorepo project root. Please try running the cdf-cli command again but from within the CDF monorepo project.`;
            }
            const snippetAbsolutePath = await getAbsolutePath(monorepoRoot, answer);
            if (!fs.existsSync(snippetAbsolutePath)) {
                return `You must enter a valid path.\n'${answer}' does not exist.`;
            }
            return true;
        },
    };
}
