import {
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { copy } from './copy';

type FileModel = { [key: string]: FileModel | string };
type FileModelEntry = FileModel[''];

function populateFiles(model: FileModelEntry, target = '.') {
    if (typeof model === 'string') {
        writeFileSync(target, model);
        return;
    }

    mkdirSync(target, { recursive: true });
    for (const key in model) populateFiles(model[key], path.join(target, key));
}

function convertHierarchyToModel(target = '.'): FileModelEntry {
    const stat = lstatSync(target);
    if (stat.isFile()) return readFileSync(target, 'utf-8');

    const result: FileModel = {};
    for (const child of readdirSync(target))
        result[child] = convertHierarchyToModel(path.join(target, child));
    return result;
}

const testModel = {
    a: '/a',
    level1a: {
        a: '/level1a/a',
        b: '/level1a/b',
        level2a: {
            a: '/level1a/level2a/a',
            b: '/level1a/level2a/b',
        },
        level2b: {
            a: '/level1a/level2b/a',
        },
    },
    level1b: {
        level2a: {
            level3a: {
                level4a: {
                    a: '/level1b/level2a/level3a/level4a',
                },
            },
        },
    },
};

describe('copy', () => {
    let sourceDir: string;
    let targetDir: string;
    let originalCwd = process.cwd();

    beforeAll(() => {
        sourceDir = mkdtempSync(path.resolve(tmpdir(), 'copy-test-source'));
        process.chdir(sourceDir);

        // Populate the source dir with contents
        populateFiles(testModel);
    });

    afterAll(() => {
        process.chdir(originalCwd);
        rmSync(sourceDir, { force: true, recursive: true });
    });

    beforeEach(() => {
        targetDir = mkdtempSync(path.resolve(tmpdir(), 'copy-test-target'));
    });

    afterEach(() => {
        rmSync(targetDir, { force: true, recursive: true });
    });

    it('copies a single file when targeting file', async () => {
        const to = path.resolve(targetDir, 'a');
        await copy({ to, from: 'a' });
        expect(convertHierarchyToModel(targetDir)).toMatchSnapshot();
    });

    it('copies a whole directory when targeting a directory', async () => {
        const to = path.resolve(targetDir, 'nested');
        await copy({ to, from: path.join(sourceDir, 'level1a', 'level2a') });
        expect(convertHierarchyToModel(targetDir)).toMatchSnapshot();
    });

    it.each(['a', '*', '**/*', 'level1a/**/b'])(
        'copies files matching pattern (%s)',
        async (pattern) => {
            const to = path.resolve(targetDir);
            await copy({ to, from: '', pattern });
            expect(convertHierarchyToModel(targetDir)).toMatchSnapshot();
        },
    );
});
