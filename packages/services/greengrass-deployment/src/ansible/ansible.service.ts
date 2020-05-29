/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { injectable } from 'inversify';

import { logger } from '../utils/logger';
import { Shell, ShellCommand } from '../utils/shell';
import { AnsibleExecutionParams } from './ansible.model';

@injectable()
export class AnsibleService {

    private async verifyAnsible() {
        logger.info(`ansible.service verify`);
        let command;
        try {
            command = await new Shell().exec('ansible --version');
        } catch (err) {
            logger.error(`ansible.service verify: err: ${JSON.stringify(err)}`);
            if(err.message.indexOf('command not found')) {
                throw new Error('Ansible module not found');
            }
            throw new Error(err);
        }
        return command;
    }

    public async executePlaybook(params: AnsibleExecutionParams) {
        logger.info(`AnsibleService.executePlaybook: in: params: ${JSON.stringify(params)}`);

        // Verify if ansible is available
        await this.verifyAnsible();

        // create a shell command
        const command = new ShellCommand('ansible-playbook', params.opts, [params.playbookLocation]);

        // execute ansible playbook
        let execution;
        try {
            execution = await new Shell().exec(command.toString());
        } catch (err) {
            logger.error(`ansible.service execute: err: ${JSON.stringify(err)}`);
            throw new Error(err);
        }

        logger.info(`AnsibleService.executePlaybook: out: execution: ${JSON.stringify(execution)}`);
        return execution;
    }

}
