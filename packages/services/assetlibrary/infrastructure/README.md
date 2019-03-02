# Deploying the Asset Library

## Pre-Requisities

- `cdf-bootstrap/infrastructure/cdf-networking` CloudFormation stack has been deployed
- `cdf-assetlibrary/infrastructure/cdf-neptune` CloudFormation stack has been deployed
- Create an S3 bucket to publish CloudFormation artifacts to

## Deployment Steps

The following describes to most basic of deployments.  Refer to the `./infrastructure/package.bash` and `./infrastructure/deply.bash` files details on more advanced options available.

- Initialize and build the project

```sh
npm install && npm run build
```

- Package the CloudFormation template and upload to the S3 bucket

```sh
./infrastructure/package.bash -b {BUCKET}

e.g.
./infrastructure/package.bash -b my_s3_deployment_bucket
```

- Deploy the CloudFormation template
```sh
./infrastructure/deploy.bash -e {ENVIRONMENT_NAME} -c {APPLICATION_CONFIGURATION_OVERRIDES}

e.g.
./infrastructure/deploy.bash -e development -c ../cdf-infrastructure-{customer}/assetlibrary/development-config.json
```


