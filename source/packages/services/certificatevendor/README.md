# CERTIFICATE VENDOR

## Introduction

The certificate vendor manages the rotation of certificates involving a number of moving parts across CDF and AWS IoT.

There are two flows for certificate rotation. In the fist case, device certificates are pre-created and registered before the rotation request. In this case the device requests a new certificate and is vended an S3 presigned URL in order to download the certificate package. In the second case, the device provides the certificate vendor module a CSR. In this way the device can request an updated certificate while keeping the private key on the device. The certificate vendor then uses a CA certificate registered with AWS IoT to create a device certificate from the CSR and return this certificate to the device.

## Pre-requisites

### Pre-created certificates

A certificate package comprising of the certificate, public key and private key is to be created and registered with AWS IoT.  This certificate package is to be zipped, and stored in S3 with the name of the zip matching the thing name of the intended device.  The `certificateId` is associated with the certificate package by setting the `x-amz-meta-certificateid` S3 user metadata attribute of the uploaded zip file.

### Certificate Creation with a device CSR

A CA certificate needs to be registered with AWS IoT. In addtion, the CA private key needs to be encrypted and stored in EC2 Parameter store so the certificate vendor module can sign device certificates using the CA.

## Deployment

The following resources are automatically created as part of the deployment and utilized by this flow:

A _thing group_ (default named `cdfRotateCertificates`).  Add devices to this thing group that require certificates rotating.

Using the CDF Commands module (a required dependency), a command template is created to define the structure of an AWS IoT Job to request devices to rotate certificates.  Again using the CDF Commands module a command is created of that template to create a continuous AWS IoT Job targeting the _cdfRotateCertificates_ thing group.  Both the template and command creation is taken care of as part of the initial deployment.

Example CDF Commands module template:
```json
{
    "templateId": "RotateCertificates",
    "description": "Rotate certificates",
    "operation" : "RotateCertificates",
    "document": "{\"get\":{\"subscribe\":\"${cdf:parameter:getSubscribeTopic}\",\"publish\":\"${cdf:parameter:getPublishTopic}\"},\"ack\":{\"subscribe\":\"${cdf:parameter:ackSubscribeTopic}\",\"publish\":\"${cdf:parameter:ackPublishTopic}\"}}",
    "requiredDocumentParameters": [
        "getSubscribeTopic",
        "getPublishTopic",
        "ackSubscribeTopic",
        "ackPublishTopic"
    ]
}
```

Example CDF Commands module command:

* `{thingGroupArn}` is injected by the deployment script
* `{thingName}` is to be replaced on the device side by the device itself

```json
{
 "templateId": "RotateCertificates",
 "targets": ["{thingGroupArn}"],
 "type": "CONTINUOUS",
 "rolloutMaximumPerMinute": 120,
 "documentParameters": {
        "getSubscribeTopic": "cdf/certificates/{thingName}/get/+",
        "getPublishTopic": "cdf/certificates/{thingName}/get",
        "ackSubscribeTopic": "cdf/certificates/{thingName}/ack/+",
        "ackPublishTopic": "cdf/certificates/{thingName}/ack"
    }
}
```

## Certificate rotation flow

As part of the device startup sequence it should subscribe to AWS IoT jobs.  

Add the device to the `cdfRotateCertificates` thing group.  This will send a job to the targetted device which instructs the device to start the certificate rotation process.  The Job document contains the publish and subscribe topics for certificate rotation.  

Example job document (the device to replace the {thingName} token):

```json
{
    "operation": "RotateCertificates",
    "get":{
        "subscribe":"cdf/certificates/{thingName}/get/+",
        "publish":"cdf/certificates/{thingName}/get"
    },
    "ack":{
        "subscribe":"cdf/certificates/{thingName}/ack/+",
        "publish":"cdf/certificates/{thingName}/ack"
    }
}
```

Certificate Vendor supports two methods of requesting certificates:

* pre-created certificates which are stored in a secure S3 location and returned via a presigned URL when the device sends a `get` message
* a device sends a `get` message and provides a CSR in the request - certificate vendor signs the certificate with an IoT registered CA and returns the new certificate to the device as the MQTT response

The device sends a request to the CDF Certificate Vendor module via the above publish topic.

Example MQTT message body sent from the device to the AWS IoT Gateway to retrieve pre-created a certificate and keys:

```sh
MQTT SUBSCRIBE TOPIC:     cdf/certificates/thing001/get/+
MQTT PUBLISH TOPIC:       cdf/certificates/thing001/get
MQTT PUBLISH BODY:        empty
```

Example MQTT message body sent from the device to the AWS IoT Gateway to retrieve a certificate based on a provided CSR:

```sh
MQTT SUBSCRIBE TOPIC:     cdf/certificates/thing001/get/+
MQTT PUBLISH TOPIC:       cdf/certificates/thing001/get
MQTT PUBLISH BODY:        
{
    "csr":"-----BEGIN CERTIFICATE REQUEST-----\nCSR CONTENT\n-----END CERTIFICATE REQUEST-----"
}
```

Example MQTT message body sent from the device to the AWS IoT Gateway to retrieve a certificate based on a provided CSR. That inherits its policies from an existing certificate:

```sh
MQTT SUBSCRIBE TOPIC:     cdf/certificates/thing001/get/+
MQTT PUBLISH TOPIC:       cdf/certificates/thing001/get
MQTT PUBLISH BODY:        
{
    "previousCertificateId" : "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "csr":"-----BEGIN CERTIFICATE REQUEST-----\nCSR CONTENT\n-----END CERTIFICATE REQUEST-----"
}
```

Upon receiving the request, the CDF Certificate Vendor module validates that the device is approved to received a new certificate. The registry to be used, whether the AWS IoT Device Registry or the CDF Asset Library module, is configured as part of the initial deployment. This reference implementation determines whether something is approved by checking its existence. If these behavior needs to be enhanced, refer to `src/registry/assetlibrary.service.ts` / `src/registry/deviceregistry.service.ts`

If approved, the CDF Certificate Vendor module checks for the presence of a CSR in the request. If provided, the CSR is used to create a new device certificate and returned to the device. If not present, teh CDF Certificate Vendor module proceeds to download the S3 Object Metadata associated with the certificate package to retrieve the `certificateId`, activates the certificate within AWS IoT, then constructs and returns a pre-signed url to the device for secure downloading of the certificate package.  Finally the device status is updated to activated.

Below are example success responses sent from the CDF Certificate Vendor module to the device, published to the `cdf/certificates/{thingName}/get/accepted` MQTT topic:

Pre-created certificate to be retrieved from S3:

```json
{
    "deviceId": "device123",
    "action": "get",
    "location": "https://cdf-xxxxxxxxxxxx-us-west-2.s3.amazonaws.com/certificates/device123.zip?AWSAccessKeyId=XXXXXXXXXXXXXXXXXX&Expires=1542129538&Signature=XXXXXXXXXXXXXXX"
}
```

Certificate requested by the device with a CSR:

```json
{
    "deviceId": "device123",
    "action": "get",
    "certificateId" : "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", 
    "certificate": "-----BEGIN CERTIFICATE-----\nCERTIFICATE CONTENT\n-----END CERTIFICATE-----"
}
```

Upon receiving the _get_ response, the device downloads the certificate package (if delivered via presigned URL) and replaces its existing certificates. At this stage the device needs to connect to AWS IoT using the new certificate. Once connected, the device shoud send an acknowledgement to the CDF Certificate Vendor module.  Upon receiving the acknowledgement the CDF Certificate Vendor module optionally diassociates and deletes the old certificate, followed by removing the device from the `cdfRotateCertificates` thing group.

Example acknowledgement message:

```sh
MQTT SUBSCRIBE TOPIC:     cdf/certificates/thing001/ack/+
MQTT PUBLISH TOPIC:       cdf/certificates/thing001/ack
MQTT PUBLISH BODY:        empty
```

If any failures occur during this flow, a rejected message is sent to the device, published to the `cdf/certificates/{thingName}/get/rejected` or  `cdf/certificates/{thingName}/ack/rejected` MQTT topics.  Example message:

```json
{
    "deviceId": "device123",
    "message": "DEVICE_NOT_WHITELISTED"
}
```

## Security

An AWS IoT policy must exist and be associated with the certificates to enforce the device to use its thing name as the MQTT clientId.  

In addition the profile should be configured to allow devices to receive AWS IoT Jobs, and to allow for publishing requests to and receiving responses from the CDF Certificate Vendor module as itself.

Only apprvoed devices (devices that exist within the Device Registry or Asset Library) are authorized to request new certificates.

An example AWS IoT policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["iot:Connect"],
            "Resource": ["*"],  
            "Condition":{  
                "Bool":{  
                    "iot:Connection.Thing.IsAttached":["true"]
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "iot:Publish",
                "iot:Receive"
            ],
            "Resource": [
                "arn:aws:iot:${cdf:region}:${cdf:accountId}:topic/cdf/certificates/${iot:ClientId}/*",
                "arn:aws:iot:${cdf:region}:${cdf:accountId}:topic/$aws/things/${iot:ClientId}/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "iot:Subscribe"
            ],
            "Resource": [
                "arn:aws:iot:${cdf:region}:${cdf:accountId}:topicfilter/cdf/certificates/${iot:ClientId}/*",
                "arn:aws:iot:${cdf:region}:${cdf:accountId}:topicfilter/$aws/things/${iot:ClientId}/*"
            ]
        }
    ]
}

```

## Useful Links

* [Application configuration](docs/configuration.md)
* [High-level architecture diagram](docs/images/certificatevendor-hla.png)
