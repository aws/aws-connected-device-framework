# Deploying Bulk Certs

## Pre-Requisities

- An S3 bucket to publish CloudFormation artifacts
- An S3 bucket to contain provisioning templates

## Registering an IoT CA

To create certificates (as part of a provisioning template pre/post step), _provisioning_ uses a CA certificate registered with AWS IoT. To sign these certificates, _provisioning_ needs the CA certificate as well as the corresponding private key. _Provisioning_ retrieves the CA certificate directly from AWS IoT and retrieves the private key from AWS Systems Manager as an encrypted secure string. To allow for this the following steps need to be done:

### Register your CA with AWS IoT

Refer to [this document](https://docs.aws.amazon.com/iot/latest/developerguide/device-certs-your-own.html) for registering your CA. If you are testing, there are instructions in this document for creating a test CA certificate.

### Create a KMS Key for encrypting/decrypting the CA private key

KMS is used to encrypt the CA private key for storage in SSM. To do so, a KMS key is required. This can be done in the KMS console by creating a customer-managed key.

### Upload your CA private key to SSM as a secure string

The following AWS CLI command uploads a private key file to SSM. It is recommended to use the CLI rather than copy pasting into the console to avoid formatting issues in the console.

**Note**: By convention, _cdf-bulkcerts_ expects the SSM parameter name in the format `cdf-ca-key-<CA KEY ID>`, where the ID is the CA certificate ID when it is registered in AWS IoT.

```sh
aws --profile <PROFILE> --region <REGION> ssm put-parameter --type SecureString --key-id <KMS KEY ID> --name cdf-ca-key-<CA KEY ID> --value file://rootCA.key --overwrite
```

## Deployment Steps

The following steps describe a basic deployment.  Refer to the `./infrastructure/package-cfn.bash` and `./infrastructure/deploy-cfn.bash` files details on more advanced options available.

- Initialize and build the project
- Package the CloudFormation template and upload to the S3 bucket

```sh
./infrastructure/package.bash -b <S3 ARTIFACTS BUCKET>
```

- Deploy the CloudFormation template

```sh
./infrastructure/deploy-cfn.bash -e <ENVIRONMENT NAME> -c ../cdf-infrastructure-<CUSTOMER PROJECT>/provisioning/development-config.json -k <KMS KEY ID>
```
