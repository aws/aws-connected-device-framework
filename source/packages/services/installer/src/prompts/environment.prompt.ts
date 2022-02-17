import fs from 'fs';
import path from 'path';

export function overwriteEnvironmentPrompt(): unknown {
  return {
    message: (answers:unknown) => `Configuration for environment '${answers['environment']}' already exists. Assume this one?`,
    type: 'confirm',
    name: 'confirmOverwrite',
    when: (answers:unknown) => {
      const loc = path.join(answers['configurationPath'], answers['environment']);
      if (fs.existsSync(loc)) {
        return true;
      }
      return false;
    }
  };
}
