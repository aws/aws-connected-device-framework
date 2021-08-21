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
import { promisify } from 'util';
import { exec } from 'child_process';

export class Shell {

    public async exec(command: string): Promise<string> {
        const _exec = promisify(exec);
        const { stdout, stderr } = await _exec(command);

        // Ignore warnings on errors
        if(stderr && !stderr.includes('[WARNING]')) {
            throw new Error(stderr);
        }

        return stdout;
    }
}

export class ShellCommand {
    public readonly module:string;
    public readonly opts:string[] = [];
    public readonly params?: string[] = [];

    constructor(module: string, opts?: string[], params?: string[]) {
        this.module = module;
        this.opts = opts;
        this.params = params;
    }

    // TODO: fix this
    get opts_cli(): string {
        let optsString = '';
        this.opts.forEach((opt: string) => {
            optsString = optsString.concat(` --${opt}`);
        });
        return optsString;
    }

    // TODO: fix this
    get cli_params(): string {
        let paramsString = '';
        this.params.forEach((opt: string) => {
            paramsString = paramsString.concat(` ${opt}`);
        });
        return paramsString;
    }

    toString(): string {
        return `${this.module}${this.opts_cli}${this.cli_params}`;
    }

}
