# Deploying the Bulk Certs

## Pre-Requisities

- `cdf-assetlibrary/infrastructure/cdf-assetlibrary` CloudFormation stack has been deployed
- `cdf-provisioning/infrastructure/cdf-provisioning` CloudFormation stack has been deployed

## Deployment Steps

First, build the zip containing the lambda and its dependencies...

```sh
npm run build
```

Define the config (any paths specified are relative to the asset library project root:

```sh
### MANDATORY
export ENVIRONMENT=
export FACADE_CONFIG_LOCATION=
export AWS_REGION=
export DEPLOY_ARTIFACTS_STORE_BUCKET=

### OPTIONAL
export CUSTOM_AUTH_STACK_NAME=
export AWS_PROFILE=
```

Package it and upload to S3...

```sh
### RUN FROM PROJECT ROOT:
infrastructure/package-cfn.bash
```

Deploy...

```sh
### RUN FROM PROJECT ROOT:
infrastructure/deploy-cfn.bash
```
