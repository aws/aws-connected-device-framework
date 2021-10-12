# COMMANDS PRE-SIGNED URLS

## Introduction

As part of defining a command template within the commands module, pre-signed urls can be configured to provide a secure way to download files.  In addition, command templates can be configured to allow for devices to request pre-signed urls to upload content relevant to the command.

## Enabling Downloading Of Files

The following represents a command template that requires the file with alias `file001` to be provided as part of the command:

```json
{
    "templateId": "ExampleTemplate",
    "description": "An example template allowing a file to be downloaded",
    "document": "{\"operation\":\"ExampleCommand\", \"file001\":\"${cdf:file:file001}\"}",
    "requiredFiles": [
        "file001"
    ],
    "presignedUrlExpiresInSeconds": 3600
}
```

It is recommended that the name of the attribute representing the file in the document json is named the same as the file alias (`file001` in the above template).  This will make it easier for a device to request a new pre-signed url for a file should the pre-signed url expire.

When a command is created from the above template, and then published, a pre-signed url will be provided for `file001` that expires as configured by `presignedUrlExpiresInSeconds`.

The required file `file001` may be uploaded directly after creating a command, or alternatively a path to an existing file stored on S3 may be provided:

### Providing Files For Download

```
PUT /commands/{commandId}/files/file001 HTTP/1.1
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="myfile.txt"
Content-Type: text/plain


------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

In this scenario the file will be uploaded to `${aws.s3.bucket}:${aws.s3.prefix}commands/{commandId}/files/{fileAlias}`.

### Providing the path to a pre-existing S3 file for download

```
PUT /commands/{commandId}/files/file001 HTTP/1.1
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="s3BucketName"

myBucket

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="s3ObjectKey"

path/to/my/file


------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

## Enabling Uploading Files From A Device

First, to allow file uploads by a device, the command template must be configured as follows:

```json
{
    "templateId": "ExampleTemplate",
    "description": "An example template allowing files uploaded",
    "document": "{\"operation\":\"ExampleCommand\"}",
    "allowFileUploads": true,
    "presignedUrlExpiresInSeconds": 3600
}
```

When files are uploaded from a device, they are stored within the root key `${aws.s3.bucket}:${aws.s3.prefix}commands/{commandId}/uploads/{thingName}`.

## Uploading Files From A Device

As pre-signed urls are generated per file, and the specific files to be uploaded may only be known by a device at time of execution, a mechanism to allow devices to request pre-signed urls (via mqtt) for file upload is provided is follows:

Step 1:  Set up the subscription to receive a response before making the request itself:

```mqtt
cdf/commands/presignedurl/{commandId}/{thingName}/uploads/accepted
cdf/commands/presignedurl/{commandId}/{thingName}/uploads/rejected
```

Step 2:  Publish a request for a new pre-signed urls:

```mqtt
cdf/commands/presignedurl/{commandId}/{thingName}/uploads
```

The request payload:

```json
{
    "requestedObjectKeys": ["relative/path/to/my/file"]
}
```

Step 3:  Receiving the pre-signed urls:

A response will be published to the accepted/rejected topics that the device subscribed to in step 1 as follows:

```json
{
    "thingName": "esdn",
    "commandId": "commandId",
    "status": "FAILED|SUCCESS",
    "presignedUrls": {
        "relative/path/to/my/file": "{pre-signed url}"
    }
}
```

The attribute `presignedUrls` is a map, where each of its keys correponds to one of the requested object keys.

The relative path provided as `requestedObjectKey` is stored within `${aws.s3.bucket}:${aws.s3.prefix}commands/{commandId}/uploads/{thingName}`.

## Refreshing Pre-signed Urls From A Device

Pre-signed urls expire based on their configured `presignedUrlExpiresInSeconds`.  It is possible to determine if a pre-signed url is expired before attempting to use by checking its `X-Amz-Date` query string parameter.  If the pre-signed url expires during use, a `403 Forbidden` http response code is returned.

Devices may only request pre-signed urls for content associated with commands that they are part of.

To request a new pre-signed url for a file to upload, make the same MQTT request as described in the `Uploading Files` section.

To request a new pre-signed url for a file to download, perform the following steps:

Step 1:  Set up the subscription to receive a response before making the request itself:

```mqtt
cdf/commands/presignedurl/{commandId}/{thingName}/downloads/accepted
cdf/commands/presignedurl/{commandId}/{thingName}/downloads/rejected
```

Step 2:  Publish a request for a new pre-signed url:

```mqtt
cdf/commands/presignedurl/{commandId}/{thingName}/downloads
```

The request payload:

```json
{
    "requestedFileAliases": ["file001"]
}
```

Step 3:  Receiving the pre-signed urls:

A response will be published to the accepted/rejected topics that the device subscribed to in step 1 as follows:

```json
{
    "thingName": "esdn",
    "commandId": "commandId",
    "status": "FAILED|SUCCESS",
    "presignedUrls": {
        "file001": "{pre-signed url}"
    }
}
```

The attribute `presignedUrls` is a map, where each of its keys correponds to one of the requested file aliases.
