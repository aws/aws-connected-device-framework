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

    public async executePlaybook(params: AnsibleExecutionParams): Promise<string> {
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
