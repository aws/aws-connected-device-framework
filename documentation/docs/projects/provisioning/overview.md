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

