# COMMANDS PRE-SIGNED URLS

## Introduction

As part of defining a command template within the commands service, pre-signed urls can be configured to provide a secure way to download files.  In addition, command templates can be configured to allow for devices to request pre-signed urls to upload content relevant to the command.  Refer to the [Presigned Urls (User)](./presigned-urls-user.md) page for a description of the functionality offered by pre-signed urls.  This page focuses on its design and implementation.

## MQTT Listener

Requests for refreshing expired pre-signed urls are sent from the device to specific MQTT topics.  As there may be many instances of the commands service running, we need to ensure that the request is normally handled just once (possible to be handled at least once).  To handle this, an AWS IoT Rule subscribes to these request topics, extracts the `thingName` from the topic structure, and forwards the request to an instance of the _Pre-signed Service_ of the commands service.

## Security

When a device is requesting a pre-signed url, the commands service validates that the device is part of the command in context.

If the request is for downloading a file, only the files originally provided along with the command (via its file alias) may be requested.

If the request is for uploading a file, the pre-signed urls are generated for files located within the `${aws.s3.bucket}:${aws.s3.prefix}commands/{commandId}/uploads/{thingName}/` key.
