/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
