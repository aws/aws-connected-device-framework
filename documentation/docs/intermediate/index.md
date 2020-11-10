# Intermediate Track

## Development
Topic | Description
---|---
[Getting started](../development/quickstart.md)
[Pre-requisities](../development/prerequisites.md) |
[Tech Stack](../development/tech-stack.md) |
[Dependency Injection](../development/dependency-injection.md) |
[Asynchronous Programming](../development/async.md) |
[Config](../development/config.md) |
[Unit Testing](../development/unit-testing.md) |


## Overview
Topic | Description
---|---
[High Level Overview](../projects/overview.md) | The big picture of CDF.
[Postman](../postman/index.md) | A Postman collection providing examples of how to call the CDF (Core) services.

## Asset Library Service
Topic | Description
---|---
[Overview](../projects/assetlibrary/overview.md) | An overview of the _asset library_ service.
[Modes](../projects/assetlibrary/modes.md) | A description of the modes the Asset Library can run, along with available functionality in each.
[Templates (User)](../projects/assetlibrary/templates-user.md) | How to configure device/group templates.
[Templates (Developer)](../projects/assetlibrary/templates-developer.md) | The device and group templates system design.
[Profiles](../projects/assetlibrary/profiles.md) | Device and group profiles.
[Events](../projects/assetlibrary/events.md) | Details of events published by the Asset Library.
[Swagger](../projects/assetlibrary/assetlibrary-swagger.md) | Swagger definition.


## Asset Library History Service
Topic | Description
---|---
[Overview](../projects/assetlibrary-history/overview.md) | An overview of the _asset library history_ service.
[Swagger](../projects/assetlibrary-history/assetlibraryhistory-swagger.md) | Swagger definition.

## Provisioning Service
Topic | Description
---|---
[Overview](../projects/provisioning/overview.md) | An overview of the _provisioning_ service.

## Certificate Activator Service
Topic | Description
---|---
[Overview](../projects/certificateactivator/overview.md) | An overview of the _certificateactivator_ service.

## Certificate Vendor Service
Topic | Description
---|---
[Overview](../projects/certificatevendor/overview.md) | An overview of the _certificatevendor_ service.

## Commands Service
Topic | Description
---|---
[Overview](../projects/commands/overview.md) | An overview of the _commands_ service.
[Ephemeral Groups](../projects/commands/ephemeral-groups.md) | How ephemeral groups are utilized to send commands to thousands of devices.
[Pre-signed URLS (User)](../projects/commands/presigned-urls-user.md) | How to configure and consume pre-signed urls.
[Pre-signed URLS (Developer)](../projects/commands/presigned-urls-developer.md) | Implementation details of pre-signed urls.
[Swagger](../projects/commands/commands-swagger.md) | Swagger definition.

## Custom Device Authorizer
Topic | Description
---|---
[Overview](../projects/auth-devicecert/overview.md) | An example implementation of a custom authorizer that authenticates HTTP calls using the device certificate.

## Device Monitoring Service
Topic | Description
---|---
[Overview](../projects/devicemonitoring/overview.md) | A device monitoring service that updates the Asset Library with near real-time device connection status.

## Request Queue Service
Topic | Description
---|---
[Overview](../projects/request-queue/overview.md) | A service for queueing API requests. Can be used as part of an high-availabilty strategy.