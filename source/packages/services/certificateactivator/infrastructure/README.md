# Deploying the CDF Certificate Activator Service

## Pre-Requisities

- an S3 bucket created to contain the certificate revocation list (CRL)
- a CRL uploaded to the S3 bucket

## Deployment Steps

First, build the zip containing the lambda and its dependencies...

```sh
npm run build
```

Package it and upload to S3. Usage is found by running the package command with no arguments.

```sh
### RUN FROM PROJECT ROOT:
infrastructure/package-cfn.bash
```

Deploy. Usage is found by running the deploy command with no arguments.

```sh
### RUN FROM PROJECT ROOT:
infrastructure/deploy-cfn.bash
```
