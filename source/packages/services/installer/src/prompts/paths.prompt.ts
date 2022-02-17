import fs from 'fs';
import inquirer from 'inquirer';
import inquirerFuzzyPath from 'inquirer-fuzzy-path';
import path from 'path';
import pkgDir from 'pkg-dir';

inquirer.registerPrompt('fuzzypath', inquirerFuzzyPath);

export function fuzzyPathPrompt(message: string, name: string, itemType: 'any' | 'directory' | 'file', rootPath?: string, initial?: string): unknown {
  return {
    message,
    type: 'fuzzypath',
    name,
    default: initial,
    askAnswered: true,
    excludePath: (nodePath: string) => nodePath.startsWith('node_modules') || nodePath.startsWith('dist'),
    excludeFilter: (nodePath: string) => nodePath == '.',
    itemType,
    rootPath: rootPath ?? path.parse(process.cwd()).root,
    depthLimit: 5,
    validate(answer: string) {
      if ((answer?.length ?? 0) === 0) {
        return `You must enter a path`;
      }
      if (!fs.existsSync(answer)) {
        return `You must enter a valid path.\n'${answer}' does not exist.`;
      }
      return true;
    },
  };
}

export async function getAbsolutePath(relativePath: string): Promise<string> {
  const installerPackageRoot = await pkgDir();
  const monorepoRoot = path.join(installerPackageRoot, '..', '..', '..', '..');
  const absolutePath = path.join(monorepoRoot, relativePath)
  return absolutePath
}

export function pathPrompt(message: string, name: string, initial?: string): unknown {
  return {
    message,
    type: 'input',
    name,
    default: initial,
    askAnswered: true,
    async validate(answer: string) {
      if ((answer?.length ?? 0) === 0) {
        return `You must enter a path.`;
      }
      const snippetAbsolutePath = await getAbsolutePath(answer)
      if (!fs.existsSync(snippetAbsolutePath)) {
        return `You must enter a valid path.\n'${answer}' does not exist.`;
      }
      return true;
    },
  };
}
