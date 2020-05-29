/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { promisify } from 'util';
import { exec } from 'child_process';

export class Shell {

    public async exec(command: string) {
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
    get opts_cli() {
        let optsString: string = '';
        this.opts.forEach((opt: string) => {
            optsString = optsString.concat(` --${opt}`);
        });
        return optsString;
    }

    // TODO: fix this
    get cli_params(): string {
        let paramsString: string = '';
        this.params.forEach((opt: string) => {
            paramsString = paramsString.concat(` ${opt}`);
        });
        return paramsString;
    }

    toString() {
        return `${this.module}${this.opts_cli}${this.cli_params}`;
    }

}
