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
import { Shell, ShellCommand } from './shell';

describe('shell', () => {
    it('runs a shell command through shell utility', async () => {
        const exec = await new Shell().exec('echo Hello Shell');
        expect(exec).toEqual('Hello Shell\n');
    });

    it('throws an error on bad commands', async () => {
        try {
            await new Shell().exec('ecoh Bad bin');
        } catch (err) {
            expect(err).toBeDefined();
        }
    });
});

describe('shellCommand', () => {
    it('should create a shell command', () => {
        const command = new ShellCommand('ansible', [
            'ssh-common-args=\'-o StrictHostKeyChecking=no\'',
            'u=\'ec2-user\''
        ], [
            'ping.yml'
        ]);

        const shell_command = command.toString();

        expect(shell_command).toEqual(`ansible --ssh-common-args='-o StrictHostKeyChecking=no' --u='ec2-user' ping.yml`);
    });
});
