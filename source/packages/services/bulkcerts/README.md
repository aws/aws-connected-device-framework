# BULK CERTS REST API

## Introduction

The bulk certs module allows for the creation of large batches of X.509 certificates, and optionally register them with AWS IoT.

When a batch is requested, a task is created to track the creation of certificates.  Upon task creation, the creation call is returned immediately to the caller.  The task itself is then split in smaller chunks to allow for quick processing.  Once all chunks are complete, the overall task is complete, and the certificates can be downloaded as a single zip file.

## Pre-Requisites

### [Optional] Registering a custom CA with AWS IoT

When creating device certificates they can be signed by the Amazon Root certificate authority (CA), or alternatively signed by other root CA's. It is recommended that other root CA's are used due to:

- currently all device certificates created using the Amazon Root CA are long-lived certificates. With other root CA's you have the opportunity to specify device expiration dates
- if you need devices to self-register themselves using  [just-in-time registration](https://aws.amazon.com/blogs/iot/just-in-time-registration-of-device-certificates-on-aws-iot/) (JITR) or [just-in-time provisioning](https://docs.aws.amazon.com/iot/latest/developerguide/jit-provisioning.html) (JITP) type provisioning flows, then you must register a root CA
- a recommended best practice is to use different CA's per device suppliers. Then in the event of a CA being compromised, just that single supplier can be notified and have a new CA issued for use with the other suppliers remaining unaffected

The following outlines the steps for registering other root CA's. 

> Note that a CA may be registered with just one account within a region. If your devices need the ability to connect to multiple accounts within a region, such as having the same device certificate signed by a single CA able to connect to different development, testing, and production accounts, then use the [_CDF provisioning module_](../provisioning/README.md) to auto-create the device certificate as part of the provisioning flow which supports [multi-account registration](https://docs.aws.amazon.com/iot/latest/developerguide/x509-client-certs.html#multiple-account-cert).

#### 1/ Register your CA with AWS IoT

If you need to create your own CA, refer to [Create a CA certificate](https://docs.aws.amazon.com/iot/latest/developerguide/create-your-CA-cert.html).

If you already have a CA, or have created one using the previous step, then refer to [Register your CA certificate](https://docs.aws.amazon.com/iot/latest/developerguide/register-CA-cert.html).

#### 2/ Securely store the CA private key

To sign the device certificates with a custom CA, the CA private key is required. This module uses [AWS Key Management Service (KMS)](https://aws.amazon.com/kms/) to securely store and encrypt the CA private key in [AWS Systems Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html). When you deploy this module, one of the required parameters is to specify whether an existing KMS key should be used or a new one created for this purpose.

The following AWS CLI command uploads the private key file to SSM. It is recommended to use the CLI rather than copy pasting into the console to avoid possible formatting issues in the console.

**Note**: By convention, this module expects the SSM parameter name in the format `cdf-ca-key-<CA KEY ID>`, where the `<CA KEY ID>` is the CA certificate ID (aka CA name in the AWS Console) when it is registered in AWS IoT.

```sh
# <KMS KEY ID>: The `KmsKeyId` parameter of the `cdf-bulkcerts-<env>` CloudFormation stack
# <CA KEY ID>: the CA certificate ID (aka CA name in the AWS Console)
# <PRIVATE KEY LOCATION>: the file path of the CA private key to store in SSM
aws ssm put-parameter --type SecureString /
 --key-id <KMS KEY ID> /
 --name cdf-ca-key-<CA KEY ID> /
 --value file://<PRIVATE KEY LOCATION> --overwrite
```

### Define which CA's are to be used per supplier alias

As you will see from the walkthrough below, an alias (`supplierId`) is required as part of the REST API call to create device certificates. Behind the scenes this alias is mapped to specific CA's to use to sign the device certificates. This mapping needs to be defined before device certificates can be created for a specific supplier.

The alias to CA ID is defined in the application configuration at time of deployment. If this mapping needs to change post deployment, then the application configuration should be updated followed by a redeployment. The following is an excerpt of a sample application configuration where aliases `supplier1` and `supplier2` are mapped to different custom CA's, and `supplier3` is mapped to the Amazon Root CA:

```json
{
  ...
  "supplierRootCa": {
    "supplier1": "856058e172339c0112ede7ea58616e661946bf8a85490410f8131ce651417425",
    "supplier2": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32",
    "supplier3": "AwsIotDefault"
  }
  ...
}
```

Refer to [Application configuration](docs/configuration.md) for more details on what configuration may be specified.

## Walkthrough

### 1a/ Request a batch of certificates, using pre-defined application defaults

##### Request

```sh
POST /supplier/<supplierId>/certificates
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json

{
  "quantity": 2
}
```
##### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /certificates/jshs783h
x-taskid: jshs783h

{
  "taskId": "jshs783h",
  "status": "pending"
}
```


### 1b/ Request a batch of certificates, setting certificate properties

##### Request

```sh
POST /supplier/<supplierId>/certificates
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json

{
  "quantity": 2,
  "certInfo": {
    "country": "US"
  }
}
```
##### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /certificates/jshs783h
x-taskid: jshs783h

{
  "taskId": "jshs783h",
  "status": "pending"
}
```

### 1c/ Request a batch of certificates, auto-generating the certificate common name (incremental method)

The following example  will create 100 sequential device certificates with a `commonName` starting from \``templateFoo::`\``AB1CD79EF` and ending with \``templateFoo::`\``AB1CD79F54`. This `commonName` format of \``<proviioningTemplateName>::`\``<deviceId>` is useful in JITR provisioning flows where devices are able to self register based on information presented in the certificate. Note that the count provided in the `commonName` field `${incement(100)}` will override the quantity value

##### Request

```sh
POST /supplier/<supplierId>/certificates
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json
{
  "quantity": 100,
  "certInfo": {
    "commonName": "`templateFoo::`AB1CD79EF${incement(100)}",
    "includeCA": true
  }
}
```
##### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /certificates/jshs783h
x-taskid: jshs783h

{
  "taskId": "jshs783h",
  "status": "pending"
}
```

### 1d/ Request a batch of certificates, auto-generating the certificate common name (list method)

Th following example  will create 3 device certificates with  `commonNames` of \``templateFoo::`\``AB1CD79EF1`, \``templateFoo::`\``AB1CD79EF2` and \``templateFoo::`\``AB1CD79EF3`. Note that the number of elements in the `commonNameList` array would override the quantity value

##### Request

```sh
POST /supplier/<supplierId>/certificates
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json

{
  "quantity": 3,
  "certInfo": {
    "commonName": "`templateFoo::`${list}" ,
    "commonNameList":["AB1CD79EF1","AB1CD79EF2","AB1CD79EF3"]
  }
}
```
##### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /certificates/jshs783h
x-taskid: jshs783h

{
  "taskId": "jshs783h",
  "status": "pending"
}
```

### 1e/ Request a batch of certificates, auto-generating the certificate common name (static method)

The following example  will create 100 device certificates with a static `commonName` of \``templateFoo::`\``AB1CD79EF`.

##### Request

```sh
POST /supplier/<supplierId>/certificates
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json

{
  "quantity": 100,
  "certInfo": {
    "commonName": "`templateFoo::`AB1CD79EF${static}"
  }   
}
```
##### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /certificates/jshs783h
x-taskid: jshs783h

{
  "taskId": "jshs783h",
  "status": "pending"
}
```

### 2a/ Attempt to download certificates when task is still in progress

If the certificate batch creation task is `pending` or `in_progress`, a `303` redirect will occur to return the task status.

##### Request

```sh
GET /certificates/<taskId>
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json
```
##### Response

```sh
303 Redirect to /certificates/<taskId>/task
```

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json

{
  "taskId": "jshs783h",
  "status": "in_progress",
  "chunksPending": 2,
  "chunksTotal": 12
}
```

### 2b/ Download certificate (once task complete) as a direct download of a zip file

##### Request

```sh
GET /certificates/<taskId>
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/zip
```
##### Response

```sh
Content-Type: application/zip

<Binary file>
```

### 2c/ Download certificate (once task complete) as a list of presigned urls

##### Request

```sh
GET /certificates/<taskId>?downloadtype=signedUrl
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json
```
##### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json

[ "url1", "url2", ... ]
```



## Useful Links

- [Application configuration](docs/configuration.md)
- [Swagger](docs/swagger.yml)


