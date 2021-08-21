# PROVISIONING REST API

## Introduction

The provisioning service utilizes [AWS IoT Device Provisioning](https://docs.aws.amazon.com/iot/latest/developerguide/iot-provision.html) to provide both programmatic (just-in-time) and bulk device provisioning capabilities.  The provisioning service simplifies the use of AWS IoT Device Provisioning by allowing for the use of S3 based provisioning templates, and abstracting a standard interface over both device provisioning capabilities.

In addition, the CDF Provisioning Service allows for extending the capabilities of the AWS IoT Device Provisioning templating functionality.  To provide an example, the AWS IoT Device Provisioning allows for creating certificate resources by providing a certificate signing request (CSR), a certificate ID of an existing device certificate, or a device certificate created with a CA certificate registered with AWS IoT.  This service extends these capabilities by also providing the ability to automatically create (and return) new keys and certificates for a device.

If used in conjunction with the CDF Asset Library service, provisioning templates can be assigned to one or more hierarchies, and then the appropriate provisioning template obtained based on the location of an asset within a hierarchy.

## AWS Dependencies

The provisioning service depends on the following AWS resources/services:

Service | Resource | Description
--------|----------|-------------
AWS IoT | Thing Types | Pre-existing optional Thing Types to associate with new Things
AWS IoT | Thing Groups | Pre-existing optional Thing Groups to associate with new Things
AWS IoT | Policies | Pre-existing optional Policies to associate with new Things

##Using Custom CA with CDF

The provisioning service can provision a device using a customer provided CA. The services uses the provisioning template to determine if the provisioning flow that will be executed will involve creating a device certificate from a customer provided CA. The custom CA flow within the provisioning service uses the CA stored in AWS IoT and gets the CA private key stored in SSM. 

Pre-reqs:
- CA key pair generated following the link here AWS https://docs.aws.amazon.com/iot/latest/developerguide/manage-your-CA-certs.html

To register a CA to be used by the provisioning service, the developer needs 2 items setup. The first is the CA public key and the second one is the CA private key. Following the guide to “manage your own CA Certs” The CA public key is configured within AWS IoT itself and does not need CDF specific configuration. 

The CA private key needs to be stored in SSM as a secure string using the following convention for CDF provisioning service to be able to retrieve the certificate private key to generate new certificates. 

`cdf-ca-key-${caCertId}`

Once the user has the public key in AWS IoT and the private key in SSM using the above convention. The provisioning service should be able to provision device certificates generated using a Customer provided CA

## Useful Links

- [Application configuration](docs/configuration.md)
- [Provisioning templates](docs/provisioning-templates.md)
- [Swagger](docs/swagger.yml)
- 