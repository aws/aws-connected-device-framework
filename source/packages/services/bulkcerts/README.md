# BULK CERTS REST API

## Introduction

The bulk certs module allows for the creation of large batches of X.509 certificates, and optionally register them with AWS IoT.

When a batch is requested, a task is created to track the creation of certificates.  Upon task creation, the creation call is returned immediately to the caller.  The task itself is then split in smaller chunks to allow for quick processing.  Once all chunks are complete, the overall task is complete, and the certificates can be downloaded as a single zip file.

## Registering an IoT CA

To create certificates, _bulkcertificates_ uses a CA certificate registered with AWS IoT. To sign these certificates, _bulkcertificates_ needs the CA certificate as well as the corresponding private key. _Bulk Certificates_ retrieves the CA certificate directly from AWS IoT and retrieves the private key from AWS Systems Manager as an encrypted secure string. To allow for this the following steps need to be done:

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

## Useful Links

- [Application configuration](docs/configuration.md)
- [Swagger](docs/swagger.yml)


