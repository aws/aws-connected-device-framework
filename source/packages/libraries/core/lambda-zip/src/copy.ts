import path from 'node:path';
import { promisify } from 'node:util';
import globCb from 'glob';
import { cp, lstat, mkdir } from 'node:fs/promises';

const glob = promisify(globCb);

export type CopyOptions = {
    to: string;
    from: string;
    pattern?: string;
};

async function copyItem(from: string, to: string) {
    await mkdir(path.dirname(to), { recursive: true });
    await cp(from, to, { recursive: true });
}

export async function copy(options: CopyOptions) {
    const to = path.resolve(options.to);
    const from = path.resolve(options.from);
    const pattern = options.pattern;

    const isDirectory = (await lstat(from)).isDirectory();
    if (pattern && !isDirectory)
        throw new Error(`${from} must be a directory to use pattern ${pattern}`);

    // Shortcut to copy just the one requested file
    if (!isDirectory) {
        await copyItem(from, to);
        return;
    }

    // Shortcut to not bother globbing the whole directory
    if (!pattern) {
        await copyItem(from, to);
        return;
    }

    const filesToCopy = await glob(pattern, { cwd: from, dot: true, nodir: true });
    await Promise.all(
        filesToCopy.map((file) => {
            return copyItem(path.resolve(from, file), path.resolve(to, file));
        })
    );
}
