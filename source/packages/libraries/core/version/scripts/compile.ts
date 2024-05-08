import fs from 'fs';
import readline from 'readline';
import { Project } from 'ts-morph';

/**
 * This function extract the version number from the version policies file,
 * source/common/config/rush/version-policies.json, managed by rush.
 *
 * This JSON file contains comments, therefore regular "import" statement
 * won't work. So we are reading the file line by line to get the external
 * version number.
 *
 * The errors thrown from here will ONLY happen in build time.
 *
 * @returns version number string in SemVer format
 */
async function extractVersion(): Promise<string> {
    const versionPoliciesReadStream = fs.createReadStream(
        '../../../../common/config/rush/version-policies.json'
    );
    const rl = readline.createInterface({
        input: versionPoliciesReadStream,
        crlfDelay: Infinity,
    });

    // NodeJS's readline interface doesn't support moving "only" one line.
    // if the for-loop breaks, we won't be able to get the line we need.
    // So we need to know what the "previous" line is to stop and get the
    // "current" line that contains the version number
    let previousLine: string = '';
    let versionLine: string | undefined = undefined;
    for await (const line of rl) {
        if (previousLine.includes('"policyName": "external",')) {
            versionLine = line;
            break;
        }

        previousLine = line;
    }

    if (!versionLine?.includes('"version"')) {
        throw new Error('cdf-version: fail to capture version line.');
    }

    // https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
    const versionRegex =
        /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/;
    const version = versionLine.match(versionRegex);

    if (!version) {
        throw new Error(
            `cdf-version: fail to extract version number with regex, captured version line: ${versionLine}`
        );
    }

    return version[0];
}

async function compile(): Promise<void> {
    const emittingProject = new Project({
        tsConfigFilePath: 'tsconfig.json',
    });
    const version = await extractVersion();

    const versionFile = emittingProject.getSourceFileOrThrow('src/version.ts');
    versionFile.replaceWithText((writer) => {
        writer.writeLine(`export const version = ${JSON.stringify(version)}`);
    });

    await emittingProject.emit();
}

compile();
