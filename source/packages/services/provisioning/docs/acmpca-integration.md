# ACM Private CA Integration

## Introduction

[ACM Private CA](https://docs.aws.amazon.com/acm-pca/latest/userguide/PcaWelcome.html) enables creation of private certificate authority (CA) hierarchies, including root and subordinate CAs, without the investment and maintenance costs of operating an on-premises CA. Your private CAs can be used to issue X.509 device certificates to be registered with AWS IoT.

Ensure your are familiar with the [AWS Certificate Manager Private Certificate Authority Pricing](https://aws.amazon.com/certificate-manager/pricing/) before deciding on and proceeding with this type of integration.

## Integration Methods

When using ACM PCA to issue device certificates, the integration between ACM PCA and AWS IoT can operate in one of two modes:

#### Registering device certificates in AWS IoT without a CA

In terms of ACM PCA this is the simplest to set up, and the most secure (CA private keys not required), but may have some compatability issues.

When registering the X.509 device certificates issued by ACM PCA with AWS IoT in this mode a technique known as [multi-account registration](https://docs.aws.amazon.com/iot/latest/developerguide/x509-client-certs.html#multiple-account-cert) is used which allows a device certificate to be registered with AWS IoT without the need of a corresponding registered CA. But it has the following limitations:
- Certificates used for multi-account registration are supported on the `iot:Data-ATS`, `iot:Data (legacy)`, `iot:Jobs`, and `iot:CredentialProvider` endpoint types, but not other endpoint types such as Greengrass V2.
- Devices that use multi-account registration must send the [Server Name Indication (SNI) extension](https://tools.ietf.org/html/rfc3546#section-3.1) to the Transport Layer Security (TLS) protocol and provide the complete endpoint address in the host_name field, when they connect to AWS IoT.

To use this mode, set `$.CDF.useACMPCA` to `REGISTER_WTHOUT_CA` in a [provisionig template](./provisioning-templates.md).

#### Registering an ACM PCA CA as an AWS IoT CA

In terms of AWS IoT this is the most reliable in terms of compatability with other systems, but is far more complex a step in configuring the ACM PCA CA hierarchy as access to the CA's private keys are required in order to register a ACM PCA CA as an AWS IoT CA. Refer to [IoT Provisioning Secret-free](https://github.com/aws-samples/iot-provisioning-secretfree/blob/master/doc/acm-provisioning-proto.md) AWS sample code for details on how to configure.

To use this mode, set `$.CDF.useACMPCA` to `REGISTER_WTH_CA` in a [provisionig template](./provisioning-templates.md).

