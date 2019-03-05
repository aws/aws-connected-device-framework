# Configuration

It is imperative that any customer specific configuration is kept out of the main projects.  In addition, any injection of configuration needs to be compatible with both running services locally, deploying service via CI/CD, and deploying service manually.

The following outlines a [12-factor app](https://12factor.net/config) best practice approach to configuration management..

## Application Configuration

Application configuration is handled via the npm `config` module.  in each application, the following should reside:

### src/config/default.yaml

This file defines all configuration keys for the application.  This file should include any non-environment specific configuration values relevant to the application.  Note:  Environment specific configuration values should never be placed in here.

### src/config/custom-environment-variables.yaml

The presence of this file allows for environment variables to be injected into configuration at runtime.  This file should contain the same keys as `src/config/default.yaml`, but the value represents the name of an environment variable where the `config` module will lookup configuration value overrides.

## Customer Specific Configuration

### Running services locally

The `ts.run` package script of each project is defined as follows:

```sh
"ts.run": "NODE_CONFIG=$(cat ${ASSETLIBRARY_CONFIG_LOCATION}) NODE_CONFIG_DIR='./src/config' ts-node src/lambda_proxy.ts"
```

In the above, the `${ASSETLIBRARY_CONFIG_LOCATION}` environment variable (this example is taken from the asset library project) needs to point to the location of a json configuration override file.  The format of this file is unique to each project, and needs to be based on the keys defined within the projects `src/config/default.yaml` configuration file. 

As an example to run:

```sh
ASSETLIBRARY_CONFIG_LOCATION=../cdf-config-{customer}/assetlibrary/development-local.json  npm run ts.run
```

### Deploying via CloudFormation

To facilitate the externalization of customer specific configuration, each CloudFormation template includes an `ApplicationConfigurationOverride` parameter which allows for the injection of parameters via a json formatted string.  The `ApplicationConfigurationOverride` is passed into the lambda function via the `NODE_CONFIG` variable of the `config` module.  This will be augmented with the configuration from `src/config/default.yaml`.

The `deploy-cfn.bash` script of each project is responsible for taking the value of the `${PROJECT}_CONFIG_LOCATION` environment variable, reading its contents, then passing this to the CloudFormation template.