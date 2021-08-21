# Deploying the CDF Certificate Renewer Service

## Pre-Requisities

- An S3 bucket to publish CloudFormation artifacts
- An S3 bucket to store the renewed certificates

## Deployment Steps

The following steps describe a basic deployment.  Refer to the `./infrastructure/package-cfn.bash` and `./infrastructure/deploy-cfn.bash` files details on more advanced options available.

- Initialize and build the project
- Package the CloudFormation template and upload to the S3 bucket
- Deploy the CloudFormation template

## Create S3 Deployment Bucket

```sh
aws s3 mb s3://<S3 ARTIFACTS BUCKET>
```

## Package the certificate renewer and store into S3 Deployment Bucket

```sh
./infrastructure/package.bash -b <S3 ARTIFACTS BUCKET>
```

## Deploy the CloudFormation template

```sh
./infrastructure/deploy-cfn.bash -e <ENVIRONMENT NAME> -c ../cdf-infrastructure-<CUSTOMER PROJECT>/certificaterenewer/development-config.json -b <S3 ARTIFACTS BUCKET> -p 'certificates'
```
