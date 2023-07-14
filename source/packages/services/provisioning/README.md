# PROVISIONING REST API

## Introduction

The provisioning module utilizes [AWS IoT Device Provisioning](https://docs.aws.amazon.com/iot/latest/developerguide/iot-provision.html) to provide both programmatic (just-in-time) and bulk device provisioning capabilities. The provisioning module simplifies the use of AWS IoT Device Provisioning by allowing for the use of S3 based provisioning templates, and abstracting a standard interface over both device provisioning capabilities.

In addition, the CDF Provisioning module allows for extending the capabilities of the AWS IoT Device Provisioning templating functionality. To provide an example, the AWS IoT Device Provisioning allows for creating certificate resources by providing a certificate signing request (CSR), a certificate ID of an existing device certificate, or a device certificate created with a CA certificate registered with AWS IoT. This module extends these capabilities by also providing the ability to automatically create (and return) new keys and certificates for a device.

If used in conjunction with the CDF Asset Library module, provisioning templates can be assigned to one or more hierarchies, and then the appropriate provisioning template obtained based on the location of an asset within a hierarchy.

## AWS Dependencies

The provisioning module depends on the following AWS resources/services:

| Service | Resource     | Description                                                     |
| ------- | ------------ | --------------------------------------------------------------- |
| AWS IoT | Thing Types  | Pre-existing optional Thing Types to associate with new Things  |
| AWS IoT | Thing Groups | Pre-existing optional Thing Groups to associate with new Things |
| AWS IoT | Policies     | Pre-existing optional Policies to associate with new Things     |

## AWS IoT Device Provisioning template setup

To be able to use predefined AWS IoT Device Provisioning template you need to store it in your CDF environment S3 bucket
set up during installation phase. Default settings for AWS IoT Device Provisioning template file:

```
s3://[CDF environment S3 bucket]/templates/[provisioningTemplateId].json
```

`provisioningTemplateId` - is a custom provisioning template file name which you later reference in provision a new
thing within the AWS IoT Device Registry request.

## Using Custom CA with CDF

The provisioning module can provision a device using a customer provided CA. The modules uses the provisioning template to determine if the provisioning flow that will be executed will involve creating a device certificate from a customer provided CA. The custom CA flow within the provisioning module uses the CA stored in AWS IoT and gets the CA private key stored in SSM.

Pre-reqs:

- CA key pair generated following the link here AWS https://docs.aws.amazon.com/iot/latest/developerguide/manage-your-CA-certs.html

To register a CA to be used by the provisioning module, the developer needs 2 items setup. The first is the CA public key and the second one is the CA private key. Following the guide to “manage your own CA Certs” The CA public key is configured within AWS IoT itself and does not need CDF specific configuration.

The CA private key needs to be stored in SSM as a secure string using the following convention for CDF provisioning module to be able to retrieve the certificate private key to generate new certificates.

`cdf-ca-key-${caCertId}`

Once the user has the public key in AWS IoT and the private key in SSM using the above convention. The provisioning module should be able to provision device certificates generated using a Customer provided CA

## Using ACM PCA to issue device certificates

Refer to [ACM Private CA Integration](./docs/acmpca-integration.md) for the why and how you would integrate ACM PCA with AWS IoT.

When using ACM PCA to create device certificates (see [CDF extensions to Provisioning Templates](docs/provisioning-templates.md) it is possible to define aliases to represent ACM PCA CA Arns and AWS IoT CA Arns rather than having to provide the CA Arn itself. To use, define an environment variable (either using the installer, or within the Lambda console) with a name in the format of `PCA_<alias>` and a value of the CA Arn for ACM PCA hosted CAs, and likewise environment variables with a name in the format of `CA_<alias>` and a value of the CA Arn for AWS IoT hosted CAs.

## Useful Links

- [Application configuration](docs/configuration.md)
- [Provisioning templates](docs/provisioning-templates.md)
- [Swagger](docs/swagger.yml)
- [High-level architecture diagram](docs/images/provisioning.hla.png)
