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
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { CheckboxQuestion, ConfirmQuestion, ListQuestion } from 'inquirer';
import clone from 'just-clone';
import { Answers } from '../models/answers';
import { Module, ModuleName } from '../models/modules';

export interface ModuleListItem {
    name: string;
    value: string;
    checked: boolean;
}

export function buildServicesList(modules: Module[], chosen?: string[]): ModuleListItem[] {
    // get all service modules
    const modulesList: ModuleListItem[] = modules
        .filter((m) => m.type === 'SERVICE')
        .map((m) => ({ name: m.friendlyName, value: m.name, checked: false }));

    // restore any previously selected state
    if (chosen) {
        chosen.forEach((m) => {
            const existing = modulesList.find((m2) => m2.value === m);
            if (existing) {
                existing.checked = true;
            }
        });
    }
    return modulesList;
}

export function expandModuleList(
    modules: Module[],
    chosen: ModuleName[],
    includeOptional: boolean,
): ModuleName[] {
    const expanded: ModuleName[] = [];
    const toProcess = clone(chosen);

    // start with chosen service modules
    while (toProcess.length > 0) {
        const nextName = toProcess.pop();
        if (expanded.some((m) => m === nextName)) {
            continue;
        }
        const nextMod = modules.find((m) => m.name === nextName);
        if (nextMod === undefined) {
            throw new Error(`Module ${nextName} not found`);
        }
        for (const dep of nextMod.dependsOnMandatory) {
            if (expanded.some((m) => m === dep)) {
                continue;
            }
            toProcess.push(dep);
        }
        if (includeOptional) {
            for (const dep of nextMod.dependsOnOptional) {
                if (expanded.some((m) => m === dep)) {
                    continue;
                }
                toProcess.push(dep);
            }
        }
        expanded.push(nextName);
    }

    return expanded;
}

export function topologicallySortModules(
    modules: Module[],
    toSort: string[],
    excludeOptional = true,
): string[][] {
    // console.log(`modules: ${JSON.stringify(modules)}, toSort:${toSort}`);
    const groups: string[][] = [];
    const visited: string[] = [];

    let remaining = modules.filter((m) => toSort.includes(m.name));

    // 1st process everything with no dependencies
    const level1 = remaining
        .filter((m) => m.dependsOnMandatory?.length === 0)
        .filter((m) => excludeOptional || m.dependsOnOptional?.length === 0)
        .map((m) => m.name);

    groups.push(level1);
    visited.push(...level1);
    remaining = remaining.reduce(
        (p, c) => (!level1.some((s) => s === c.name) && p.push(c), p),
        [],
    );

    // next keep processing until we have no more dependant modules to process
    let count = 0;
    while (remaining.length > 0 && count < 10) {
        const nextLevel = remaining
            .filter((m) => m.dependsOnMandatory.every((e) => visited.includes(e)))
            .filter(
                (m) => excludeOptional || m.dependsOnOptional.every((e) => visited.includes(e)),
            )
            .map((m) => m.name);

        groups.push(nextLevel);
        visited.push(...nextLevel);
        remaining = remaining.reduce(
            (p, c) => (!nextLevel.some((s) => s === c.name) && p.push(c), p),
            [],
        );
        count++;
    }
    return groups;
}

export function chooseServicesPrompt(modulesList: ModuleListItem[]): CheckboxQuestion {
    return {
        message: 'Select the CDF modules to deploy:',
        type: 'checkbox',
        name: 'modules.list',
        choices: modulesList,
        pageSize: 20,
        loop: false,
        askAnswered: true,
        validate(answer: string[]) {
            if (answer?.length === 0) {
                return 'You must choose at least one module to deploy.';
            }
            return true;
        },
    };
}

export function selectServicePrompt(modulesList: ModuleListItem[]): ListQuestion {
    return {
        message: 'Select a module:',
        type: 'list',
        choices: modulesList,
        name: 'modules.module',
        pageSize: 20,
        loop: false,
        askAnswered: true,
        validate(answer: string[]) {
            if (answer?.length === 0) {
                return 'You must select a module.';
            }
            return true;
        },
    };
}

export function confirmServicesPrompt(modules: Module[]): ConfirmQuestion {
    return {
        message: (answers: Answers) => {
            const chosenModuleNames = answers.modules.list;
            const chosenModuleFriendlyNames = modules
                .filter((m) => chosenModuleNames.includes(m.name))
                .map((m) => m.friendlyName);
            return `The following modules are selected for installation:\n${chosenModuleFriendlyNames
                .map((m) => `   - ${m}`)
                .join('\n')}\n\nOK to proceed?`;
        },
        type: 'confirm',
        name: 'modules.confirm',
        askAnswered: true,
    };
}

export function redeployIfAlreadyExistsPrompt(
    name: ModuleName,
    stackName: string,
): ConfirmQuestion {
    return {
        message: `${name} is already deployed. Redeploy?`,
        type: 'confirm',
        name: `${name}.redeploy`,
        default: false,
        askAnswered: true,
        when: async (answers: Answers) => {
            if (answers.dryRun === true) return false;
            const cloudformation = new CloudFormationClient({ region: answers.region });
            try {
                await cloudformation.send(new DescribeStacksCommand({ StackName: stackName }));
                return true;
            } catch (e) {
                return false;
            }
        },
    };
}
