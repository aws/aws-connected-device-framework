# Local Development

Ensure you have all the [prerequisites](prerequisites.md) installed.

Once a project has been cloned, run `npm install` to initialize.

Each project includes a number of pre-configured scripts to aid local development (configured in `package.json`:

## Commands

Command | Description
--- | ---
npm run compile | Transpiles the TypeScript code to JavaScript.
npm run test | Tslints the code, transpiles, then run unit tests.
npm run build | Cleans, transpiles, then zips up ready for deployment.
npm run ts.run | Runs the application locally using `ts-node`.


## Configuration

Configuration is passed into each application via external property files.  For example, to launch the asset library service with configuration held in the file `./config.json`, the following command should be run:

```sh
env ASSETLIBRARY_CONFIG_LOCATION="./config.json" npm run ts.run
```

## IDE: Using Visual Studio Code

If using [Visual Studio Code](https://code.visualstudio.com/download), the following [launch configurations](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations) are of use:

### Launch and debug the lambda_proxy TS file

Note that the following launch config will need the `env.NODE_CONFIG` attribute setting specifically for each project.  The following is an example for the asset library service.

```json
        {
            "name": "Launch and debug the lambda_proxy TS file",
            "type": "node",
            "request": "launch",
            "args": ["src/lambda_proxy.ts"],
            "runtimeArgs": ["--nolazy", "-r", "ts-node/register"],
            "sourceMaps": true,
            "cwd": "${workspaceRoot}",
            "protocol": "inspector",
            "env": {
                "NODE_CONFIG_DIR": "./src/config",
                "NODE_CONFIG": "{\"neptuneUrl\":\"ws://localhost:8182/gremlin\",\"aws\":{\"region\":\"us-west-2\",\"iot\":{\"endpoint\":\"aofuby49j6efy.iot.us-west-2.amazonaws.com\"}}}"
            },
        },
```

## Run the current unit tests using Jest

```json
        {
            "name": "Run the current unit tests using Jest",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/node_modules/jest/bin/jest",
            "args": ["${relativeFile}"],
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen",
            "env": {
                "NODE_CONFIG_DIR": "./src/config",
                "NODE_ENV": "local_test"
            },
        },
```