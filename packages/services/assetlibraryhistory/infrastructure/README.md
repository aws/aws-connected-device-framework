# Deploying the Asset Library History service

## Pre-Requisities

- Create an S3 bucket to publish CloudFormation artifacts to
- As this subscribes to MQTT topics published by the Asset Library service, deploy this before the Asset Library

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
./infrastructure/deploy.bash -e {ENVIRONMENT_NAME} -c {APPLICATION_CONFIGURATION_OVERRIDES} -t {ASSETLIBRARY_MQTT_TOPIC}

e.g.
./infrastructure/deploy.bash -e development -c ../cdf-infrastructure-{customer}/assetlibraryhistory/development-config.json -t 'cdf/assetlibrary/events/#'
```
