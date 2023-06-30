import * as copyModule from './copy';
import * as esbuild from 'esbuild';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { lambdaZip } from './lambda-zip';

jest.mock('./copy');
jest.mock('esbuild');
const build = jest.mocked(esbuild.build);
const copy = jest.mocked(copyModule.copy);

describe('lambdaZip', () => {
    let originalCwd = process.cwd();
    const outZip = 'bundle.zip';

    beforeEach(() => {
        jest.resetAllMocks();
        const tempDir = mkdtempSync(path.resolve(tmpdir(), 'lamdbaZip-test'));
        process.chdir(tempDir);
    });

    afterEach(() => {
        const tempDir = process.cwd();
        process.chdir(originalCwd);
        rmSync(tempDir, { force: true, recursive: true });
    });

    describe.each([
        {},
        { external: ['external'] },
        { entryPoints: ['entry'] },
        { entryPoints: ['entryA', 'entryB'], external: ['externalA', 'externalB'] },
    ])('with build options (%j)', (options) => {
        async function exec() {
            expect(existsSync(outZip)).toBe(false);
            await lambdaZip({ build: options, outZip });
            expect(build).toBeCalledTimes(1);
            expect(existsSync(outZip)).toBe(true);
            return build.mock.lastCall[0];
        }

        it('always configures for a lambda target', async () => {
            const passedOptions = await exec();
            expect(passedOptions.bundle).toBe(true);
            expect(passedOptions.platform).toBe('node');
            expect(passedOptions.external).toContain('aws-sdk');
        });

        it('forwards required entry points', async () => {
            const passedOptions = await exec();
            for (const entry of options.entryPoints ?? [])
                expect(passedOptions.entryPoints).toContain(entry);
        });

        it('forwards required externals', async () => {
            const passedOptions = await exec();
            for (const external of options.external ?? [])
                expect(passedOptions.external).toContain(external);
        });

        it('configures for node 18 compatibility by default', async () => {
            const passedOptions = await exec();
            expect(passedOptions.target).toBe('node18');
        });
    });

    it('cleans up temporary files', async () => {
        // Using copy mock to find build dir
        await lambdaZip({ build: {}, copy: [{ to: '', from: '' }], outZip });
        expect(copy).toBeCalledTimes(1);
        expect(existsSync(copy.mock.calls[0][0].to)).toBe(false);
    });

    it('forwards copy requests to copy', async () => {
        const copies = [
            { to: '', from: '' },
            { to: './a/b', from: './a/b' },
            { to: 'a', from: 'b', pattern: '*' },
        ];
        await lambdaZip({ build: {}, copy: copies, outZip });
        expect(copy).toBeCalledTimes(copies.length);

        const buildDir = copy.mock.calls[0][0].to;
        copies.forEach((input, index) => {
            const output = copy.mock.calls[index][0];
            expect(output.to).toBe(path.resolve(buildDir, input.to));
            expect(output.from).toBe(input.from);
            expect(output.pattern).toBe(input.pattern);
        });
    });
});
