const fs = require("fs");
const path = require("path");
 
function findRushJson() {
    let testDir = process.cwd();
    while (true) {
        const testFile = path.resolve(testDir, "rush.json");
        if (fs.existsSync(testFile))
            return testFile;
 
        const nextDir = path.dirname(testDir);
        if (nextDir === testDir)
            throw new Error(`Could not find rush.json above ${process.cwd()}`);
 
        testDir = nextDir;
    }
}
 
function getDeployDir() {
    const rushConfig = findRushJson();
    return path.resolve(path.dirname(rushConfig), "deploy");
}
 
const sourceDirName = path.basename(process.cwd());
const sourcePath = "bundle.zip";
const targetPath = path.resolve(getDeployDir(), sourceDirName, "bundle.zip");
 
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.cpSync(sourcePath, targetPath);