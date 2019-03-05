# CERTIFICATE VENDOR

## Introduction

The certificate vendor manages the rotation of certificates involving a number of moving parts across CDF and AWS IoT.  The creation and registration of certificates is handled outside this service (refer to cdf-provisioning), with this service focused on securely delivering certificates to devices.  The following document describes the various steps.

## Pre-Requisites

A certificate package comprising of the certificate, public key and private key is to be created and registered with AWS IoT.  This certificate package is to be zipped, and stored in S3 with the name of the zip matching the name of the intended device.  The certificateId is associated with the certificate package by setting the _x-amz-meta-certificateid_ S3 user metadata attribute of the zip file.

## Auto-deploy

The following resources are automatically created by the deployment script, and utilized by this flow:

A Thing Group (default named _cdfRotateCertificates_).  Add devices to this group that require certificates rotating.

Using cdf-commands a command template is created to define the structure of an AWS IoT Job to request devices to rotate certificates.  Again using cdf-commands a command is created of the template to create an continuous AWS IoT Job targeting the rotateCertificates Thing Group.  Both the template and command creation is handled by the platform deployment script.

Example cdf-commands template:
```json
{
    "templateId": "RotateCertificates",
    "description": "Rotate certificate of targetted devices",
    "operation" : "RotateCertificates",
    "document": "{\"subscribeTopic\":\"${cdf:parameters:subscribeTopic}\",\"publishTopic\":\"${cdf:parameters:publishTopic}\"}",
    "requiredDocumentParameters": [
        "subscribeTopic",
        "publishTopic"
    ]
}
```

Example cdf-commands command:

* {rotateCertificatesThingGroupArn} and {deviceActivationRuleName} are injected by the deployment script
* {thingName} is replaced on the device side by the device itself

```json
{
 "templateId": "RotateCertificates",
 "targets": ["{rotateCertificatesThingGroupArn}"],
 "type": "CONTINUOUS",
 "rolloutMaximumPerMinute": 120,
 "documentParameters": {
        "subscribeTopic":"cdf/certificates/{thingName}/+",
        "publishTopic":"$aws/rules/{deviceActivationRuleName}/cdf/certificates/{thingName}"
    }
}
```

## Certificate Rotation Flow

As part of the device startup sequence it should subscribe to AWS IoT jobs.  

Add the device to the _cdfRotateCertificates_ Thing Group.  This will send a job to the targetted device which instructs the device to start the certificate rotation process.  The Job document contains the publish and subscribe topics for certificate rotation.  

Example job document (the device to replace the {thingName} token):

```json
{   
    "operation": "RotateCertificates",
    "subscribeTopic":"cdf/certificates/{thingName}/+",
    "publishTopic":"$aws/rules/cdfcertificatevendordevelopmentMQTTRule1OS64259XAGQQ/cdf/certificates/{thingName}"}
}
```

The device sends a request to the cdf-certificate-vendor via the above publish topic.

Example MQTT message body sent from the device to the AWS IoT Gateway:

```json
{
    "action": "get"
}
```

Example message sent from AWS IoT Gateway to the cdf-certificatevendor (post message transformation by the AWS IoT Rule):

```json
{
    "deviceId": "device123",
    "action": "get"
}
```

Upon receiving the request, the cdf-certificate-vendor validates that the device has been whitelisted.  If so, it proceeds to download the S3 Object Metadata associated with the certificate package to retrieve the certificateId, activates the certificate, then constructs and returns a pre-signed url to the device for downloading of the certificate package.  Final the device status is updated to activated.

Example success response sent from cdf-certificationvendor to the device, published to the cdf/certificates/{thingName}/accepted MQTT topic:

```json
{
    "deviceId": "device123",
    "action": "get",
    "location": "https://cdf-157731826412-us-west-2.s3.amazonaws.com/certificates/device123.zip?AWSAccessKeyId=AKIAI7VRYYSEBBSSAXGQ&Expires=1542129538&Signature=fbuiPsYAhzj1TDMn4JjD6cX%2Bs4U%3D"
}
```

Upon receiving the pre-signed url, the device downloads the certificate package and replaces its existing certificates, followed by sending an acknowledgement to the cdf-certificate-vendor.  Upon receiving the ackknowledgement the cdf-certificate-vendor the device is removed from the rotateCertificates group.

If any failures occur during this flow, a rejected message is sent to the device, publish to the cdf/certificates/{thingName}/rejected MQTT topic.  Example message:

```json
{
    "deviceId": "device123",
    "action": "get",
    "message": "DEVICE_NOT_WHITELISTED"
}
```

## Security

An IoT profile should exist to enforce the device to use its Thing Name as the MQTT clientId.  

In addition the profile should be configured to allow devices to receive AWS IoT Jobs, and to allow for publishing requests to and receiving responses from the cdf-certificate-vendor service as itself.

Only whitelisted devices (devices that registered with the Asset Library) are authorized to request new certificates.
