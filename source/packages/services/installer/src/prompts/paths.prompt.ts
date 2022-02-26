import fs from 'fs';
import inquirer from 'inquirer';
import inquirerFuzzyPath from 'inquirer-fuzzy-path';
import path from 'path';
import findUp from 'find-up';

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

export async function getMonorepoRoot() : Promise<string> {
  const rootPath = await findUp('.cdf-monorepo-root');
  if (rootPath!==undefined) {
    return path.dirname(rootPath);
  } else {
    return undefined;
  }
}

export async function getAbsolutePath(monorepoRoot:string, relativePath: string): Promise<string> {
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
      const monorepoRoot = await getMonorepoRoot();
      if (monorepoRoot===undefined) {
        return `Unable to discover the CDF monorepo project root. Please try running the cdf-cli command again but from within the CDF monorepo project.`;
      }
      const snippetAbsolutePath = await getAbsolutePath(monorepoRoot, answer);
      if (!fs.existsSync(snippetAbsolutePath)) {
        return `You must enter a valid path.\n'${answer}' does not exist.`;
      }
      return true;
    },
  };
}
