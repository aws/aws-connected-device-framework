const { fork } = require('node:child_process');
const path = require('node:path');

const sourceDir = path.resolve(__dirname, '..');

const [nodePath, scriptPath, ...incomingArgs] = process.argv;

fork(path.resolve(sourceDir, 'common', 'scripts', 'install-run-rush.js'), incomingArgs, {
    cwd: sourceDir,
});