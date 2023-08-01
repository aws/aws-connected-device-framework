import archiver from 'archiver';
import { BuildOptions, build } from 'esbuild';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CopyOptions, copy } from './copy';

const defaultBuildOptions: BuildOptions = {
    bundle: true,
    minify: true,
    platform: 'node',
    target: 'node18',
    treeShaking: true,
};

function mergeBuildOptions(userOptions: BuildOptions) {
    const result = {
        ...defaultBuildOptions,
        ...userOptions,
    };

    // EDIT: disable marking aws-sdk as external until resolution of
    // https://github.com/aws/aws-connected-device-framework/issues/135
    //
    // aws-sdk is always marked external when building for lambda.
    // It is added here rather than in defaults so that user options
    // cannot prevent this.
    // result.external = ['aws-sdk', ...(result.external ?? [])];

    return result;
}

// https://stackoverflow.com/a/51518100
function zipDirectory(sourceDir: string, outPath: string) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = createWriteStream(outPath);

    // Explicit date to create deterministic builds. The explicit
    // date overrides the file dates and so makes resulting zip
    // only determined by the actual file contents.
    const date = new Date(0);

    return new Promise<void>((resolve, reject) => {
        archive
            .directory(sourceDir, false, { date })
            .on('error', (err) => reject(err))
            .pipe(stream);

        stream.on('close', () => resolve());
        archive.finalize();
    });
}

export type BundleOptions = {
    /**
     * Extra copy operations to add to the zip
     */
    copy?: CopyOptions[];

    /**
     * The options to forward to esbuild.
     */
    build: Pick<BuildOptions, 'entryPoints' | 'external'>;

    /**
     * Path to the zip file that should be emitted
     */
    outZip: string;
};

export async function lambdaZip(options: BundleOptions) {
    // Create a spot to build to.
    const outDir = await mkdtemp(
        path.resolve(os.tmpdir(), `lambdaZip_${path.basename(process.cwd())}`)
    );

    // To ensure we always clean up the temporary files we need
    // to use a try block.
    try {
        // Perform the build
        const building = build(
            mergeBuildOptions({
                ...options.build,
                outdir: outDir,
            })
        );

        // Add in copy steps, if applicable
        const copying = (options.copy ?? []).map(({ to, ...remainingOptions }) => {
            return copy({
                ...remainingOptions,
                to: path.resolve(outDir, to),
            });
        });

        await Promise.all([building, ...copying]);

        // Create the actual zip
        await rm(options.outZip, { force: true });
        await zipDirectory(outDir, options.outZip);
    } finally {
        await rm(outDir, { recursive: true });
    }
}
